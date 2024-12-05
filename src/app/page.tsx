"use client"
import { useState, useEffect, useRef } from "react";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { useTransition, animated, useSpring } from "react-spring";
import labels from './imagenet-simple-labels.json'

// Form Data structure
interface IFormInput {
  file: File[] | null;
  method: string;
  sampleSelected: boolean;
  label: string;
  epsilon: number | null;
  alpha: number | null;
  iterations: number | null;
  confidence: number | null;
  learningRate: number | null;
  overshoot: number | null;
}

// Form component definition
const MultiStepForm = () => {
  // Variable Instantiation
  const [step, setStep] = useState(1);
  const [prevStep, setPrevStep] = useState(1);
  const { control, handleSubmit, formState: { errors }, watch, setValue, getValues } = useForm<IFormInput>({
    defaultValues: {
      file: null,
      method: '',
      sampleSelected: false,
      label: '',
      epsilon: null,
      alpha: null,
      iterations: null,
      confidence: null,
      learningRate: null,
      overshoot: null,
    },
  });
  const stepTitles = ["Select Image", "Choose Attack Type", "Review & Submit", "Results"];
  const totalSteps = stepTitles.length;
  const progress = (step / totalSteps) * 100;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [containerHeight, setContainerHeight] = useState<number>(200);
  const [isSampleSelected, setIsSampleSelected] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [query, setQuery] = useState("");
  const [filteredLabels, setFilteredLabels] = useState(labels);
  const [isDisabled, setIsDisabled] = useState(false);
  const [loadingStates, setLoadingStates] = useState([true, true, true]);
  const [completedSteps, setCompletedSteps] = useState([false, false, false]);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const sampleImageRef = useRef<HTMLImageElement>(null);
  const [attackedImageBase64, setAttackedImageBase64] = useState(null);
  const [prediction, setPrediction] = useState({ isClean: -1, attackType: "unknown" });

  // Request the sample image from the server
  const fetchImage = async () => {
    try {
      await fetch('https://ai-attack-prevention-tool-backend.onrender.com/getSampleImage?sampleSelected='+getValues('sampleSelected'), {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "omit",
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data && data.image) {
          setImageSrc(`data:image/jpeg;base64,${data.image}`);
        } else {
          console.error('Error fetching image:', data.error);
        }
      })
    } catch (error) {
      console.error('Error fetching image:', error);
    }
  };

  // Query the image-net labels json file
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchQuery = e.target.value;
    setQuery(searchQuery);

    const filtered = labels.filter((item) =>
      item.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredLabels(filtered);

  };

  const handleSelectLabel = (label: string) => {
    setQuery(label);
    setFilteredLabels([]);
    setValue('label', label);
  };

  // Progress bar properties
  const progressProps = useSpring({
    width: `${progress}%`,
    config: { duration: 300 },
  });
  // Next and previous page action handlers
  const handleNext = () => {
    setPrevStep(step);
    setStep((prev) => Math.min(prev + 1, totalSteps));
  };
  const handlePrev = () => {
    setPrevStep(step);
    setStep((prev) => Math.max(prev - 1, 1));
  };
  // Submission button handler to make predictions
  const handleFormSubmit: SubmitHandler<IFormInput> = async (data) => {
    // Upload the file if sample image is not selected
    if (!isSampleSelected) {
      const file = data.file && data.file[0];

      if (file) {
        const reader = new FileReader();
  
        reader.onloadend = async () => {
          const base64String = reader.result as string;
          const payload = {
            file: base64String,
            sampleSelected: false,
          };
  
          try {
            const response = await fetch("https://ai-attack-prevention-tool-backend.onrender.com/uploadImage?sampleSelected=false", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            });
          
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
          
            const contentType = response.headers.get("Content-Type");
          
            if (contentType && contentType.includes("application/json")) {
              const result = await response.json();
              console.log("File uploaded successfully", result);
            } else {
              const textResponse = await response.text();
              console.error("Unexpected response format", textResponse);
            }
          } catch (error) {
            console.error("Error while making the POST request:", error);
          }
        };
  
        reader.readAsDataURL(file);
      } else {
        console.error("No file selected.");
      }
    }
    
    handleNext()
    console.log(data);
  };
  // Handle attack method changes
  const handleMethodChange = (method: string) => {
    setValue("method", method);
  };
  // Set/Reset sample image selection when clicked
  const handleSampleToggle = () => {
    setIsSampleSelected((prev) => {
      const newState = !prev;
      if (newState) {
        
        setQuery("goldfish");
        setValue("label", "goldfish");
        setIsDisabled(true)
        fetchImage()
        setPreviewUrl(null)
        setImageSrc(null)
      } else {
        
        setQuery(""); 
        setValue("label", "");
        setIsDisabled(true)
        setImageSrc(null)
      }
      return newState;
    });
    setValue('sampleSelected', !isSampleSelected);
  };  
  // Effect handler for loading substeps in making predictions
  useEffect(() => {
    if (step === 4) {
      const steps = [
        { message: "Processing Image", action: handlePreprocessImage },
        { message: "Performing Attack", action: handleAttackImage },
        { message: "Generating Prediction", action: handleGeneratePrediction },
      ];
  
      const runSteps = async () => {
        for (let i = 0; i < steps.length; i++) {
          setLoadingStates((prev) => {
            const updatedStates = [...prev];
            updatedStates[i] = true;
            return updatedStates;
          });
  
          console.log(steps[i].message);
  
          
          const response = await steps[i].action();
          
          if (response && response.ok) {
            setLoadingStates((prev) => {
              const updatedStates = [...prev];
              updatedStates[i] = false;
              return updatedStates;
            });
  
            setCompletedSteps((prev) => {
              const updatedCompletedSteps = [...prev];
              updatedCompletedSteps[i] = true;
              return updatedCompletedSteps;
            });
          } else {
            
            console.error(`Error during step: ${steps[i].message}`);
            setLoadingStates((prev) => {
              const updatedStates = [...prev];
              updatedStates[i] = false;
              return updatedStates;
            });
          }
        }
      };
  
      runSteps();
    }
  }, [step]);
  // Add some fixed delay
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Ask the server to preprocess the selected image
  const handlePreprocessImage = async () => {
    try {
      await delay(1500);
      const response = await fetch("https://ai-attack-prevention-tool-backend.onrender.com/preprocessImage?sampleSelected="+isSampleSelected, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log(response)
      return response;
    } catch (error) {
      console.error("Error in preprocessing image:", error);
      return { ok: false };
    }
  };
  // Ask the server to perform the requested attack
  const handleAttackImage = async () => {
    await delay(1500);
    const payload = {
      attackType: watch('method'),
      label: watch('label'),
      epsilon: watch('epsilon'),
      alpha: watch('alpha'),
      iterations: watch('iterations'),
      confidence: watch('confidence'),
      learningRate: watch('learningRate'),
      overshoot: watch('overshoot'),

    };
    try {
      const response = await fetch("https://ai-attack-prevention-tool-backend.onrender.com/attackImage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      console.log(response)
      if (response.ok) {
        const result = await response.json();
        setAttackedImageBase64(result.attacked_image_base64);
        return response;
      } else {
        console.error("Error in attacking image:", await response.text());
      }
    } catch (error) {
      console.error("Error in attacking image:", error);
    }
  };
  // Ask the server to make a prediction on the attacked image
  const handleGeneratePrediction = async () => {
    await delay(1500);
    try {
      const response = await fetch("https://ai-attack-prevention-tool-backend.onrender.com/generatePrediction", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json(); 

      const mapAttackType = (attackType: string): string => {
        const attackTypeMap: { [key: string]: string } = {
          no_attack: "No Attack",
          deepfool: "Deep Fool",
          fgsm: "FGSM",
          pgd: "PGD",
          cw: "C&W",
        };

        return attackTypeMap[attackType] || "Unknown Attack";
      };
      const readableAttackType = mapAttackType(data.attackType);
      setPrediction({ isClean: data.isClean, attackType: readableAttackType });
      console.log(data)
      return response;
    } catch (error) {
      console.error("Error in generating prediction:", error);
      return { ok: false };
    }
  };
  // Animation handlers for the container size changing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (imageRef.current) {
        setContainerHeight(imageRef.current.naturalHeight);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [previewUrl]);

  useEffect(() => {
    if (sampleImageRef.current && sampleImageRef.current.complete) {
      const imageHeight = sampleImageRef.current.naturalHeight;
      const newHeight = Math.min(imageHeight, 450);
      setContainerHeight(newHeight);
    } else {
      setContainerHeight(200)
    }
  }, [imageSrc]);

  useEffect(() => {
    const formValues = getValues();
    setValue('epsilon', formValues.epsilon);
    setValue('alpha', formValues.alpha);
    setValue('iterations', formValues.iterations);
    setValue('confidence', formValues.confidence);
    setValue('learningRate', formValues.learningRate);
    setValue('overshoot', formValues.overshoot);
  }, [getValues, setValue, watch('method')]);  
  useEffect(() => {
    if (step == 3) {
      setContainerHeight(400);
    }
    else {
      setContainerHeight(250);
    }
    
  }, [step, watch('method')]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const fieldsContainer = document.getElementById("fields-container");
      if (fieldsContainer) {
        setContainerHeight(fieldsContainer.scrollHeight + 100);
      }
    }, 200);
    
    return () => clearTimeout(timer);
  }, [watch('method')]); 

  const animatedHeightProps = useSpring({
    height: containerHeight,
    config: { tension: 200, friction: 20 },
  });

  const transitions = useTransition(step, {
    from: { 
      opacity: 0, 
      transform: `translateX(${step > prevStep ? '100%' : '-100%'})` 
    },
    enter: { 
      opacity: 1, 
      transform: "translateX(0%)" 
    },
    leave: { 
      opacity: 0, 
      transform: `translateX(${step > prevStep ? '-100%' : '100%'})` 
    },
    config: { duration: 300 },
  });


  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-6 bg-white rounded-lg shadow-lg w-full max-w-2xl h-auto max-h-[90vh]">
        <h1 className="text-2xl font-bold text-center mb-4">AI Image Attack Detector</h1>
        <p className="text-sm text-center mb-4">This tool allows you to attack any image with FGSM, PGD, C&W, and DeepFool to see if the custom ResNet50 model is able to detect the attack.</p>

        {/* Progress Bar */}
        <div className="relative mb-6 h-1 bg-gray-300 rounded-full">
          <animated.div
            className="absolute top-0 left-0 bg-blue-600 h-1 rounded-full"
            style={progressProps}
          />
        </div>

        {/* Step Title */}
        <h2 className="text-lg font-semibold text-center mb-4">{stepTitles[step - 1]}</h2>

        {/* Form */}
        <div className="relative overflow-y-auto mb-4" ref={contentRef}>
          {/* Container height animation */}
          <animated.div style={{ ...animatedHeightProps, overflow: 'hidden' }}>
            {transitions((style, currentStep) => (
              <animated.div style={{ ...style, position: 'absolute', width: '100%' }}>
                {currentStep === 1 && (
                  <div>
                    <div className="mb-4">
                      <label htmlFor="fileUpload" className="block text-sm font-medium text-gray-700">
                        Upload File
                      </label>
                      <Controller
                        name="file"
                        control={control}
                        rules={{
                          required: "File is required",
                          validate: {
                            fileType: (value) =>
                              value?.[0]?.type === "image/jpeg" || value?.[0]?.type === "image/png" || "Only JPEG/PNG files are allowed",
                            fileSize: (value) =>
                              value?.[0]?.size && value[0].size < 5 * 1024 * 1024 || "File size must be less than 5MB"},
                        }}
                        render={({ field: { onChange } }) => (
                          <>
                            <input
                              type="file"
                              id="fileUpload"
                              accept=".jpg,.jpeg,.png"
                              className="w-full p-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-none focus:ring-none"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => setPreviewUrl(reader.result as string); // Preview the file
                                  reader.readAsDataURL(file);
                                }
                                onChange(e.target.files);
                              }}
                            />
                          </>
                        )}
                      />
                      {errors.file && <p className="text-red-500 text-sm">{errors.file.message}</p>}
                      <button
                          type="button"
                          onClick={handleSampleToggle}
                          className={`px-4 py-2 mt-4 rounded-md text-white transition ${
                            isSampleSelected ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
                          }`}
                        >
                          {isSampleSelected ? "Sample Selected" : "Try a Sample Image"}
                        </button>
                        {imageSrc && (
                        <img ref={sampleImageRef} className="w-full max-w-full max-h-[300px] object-contain mt-4 border border-white-300 rounded-md" src={imageSrc} alt="Fetched from server" />
                        )}
                    </div>

                    {/* File Preview */}
                    {previewUrl && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">File Preview:</p>
                        <div className="w-full overflow-hidden relative">
                          <img
                            ref={imageRef}
                            src={previewUrl}
                            alt="Uploaded preview"
                            className="w-full max-w-full max-h-[400px] object-contain mt-4 border border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {currentStep === 2 && (
                  <div className="mb-4" id="fields-container" style={{ height: containerHeight }}>
                    <div className="flex sm:flex-row flex-col gap-3 mt-2">
                      {["No Attack", "FGSM", "PGD", "C&W", "DeepFool"].map((method) => (
                        <button
                          key={method}
                          type="button"
                          className={`px-1 py-2 w-full rounded-md text-white transition duration-200 ease-in-out ${
                            watch('method') === method
                              ? "bg-blue-600 transform scale-100"
                              : "bg-gray-600 hover:bg-gray-700"
                          }`}
                          onClick={() => handleMethodChange(method)}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                    {errors.method && <p className="text-red-500 text-sm mt-2">{errors.method.message}</p>}
                    {/* Show the image when 'No Attack' is selected */}
                    {watch('method') === 'No Attack' && (
                      <div className="mt-4">
                        {/* Display the image based on whether it's uploaded or fetched */}
                        {previewUrl ? (
                          <img className="w-full max-w-full max-h-[300px] object-contain mt-4 border border-gray-300 rounded-md" src={previewUrl} alt="Uploaded" />
                        ) : imageSrc ? (
                          <img className="w-full max-w-full max-h-[300px] object-contain mt-4 border border-gray-300 rounded-md" src={imageSrc} alt="Sample" />
                        ) : (
                          <p>No image selected</p>
                        )}
                      </div>
                    )}
                    {/* Conditionally render inputs based on selected method */}
                    {watch('method') === "FGSM" && (
                      <div className="mt-4 flex flex-col items-center justify-center ">
                        <p className="text-sm font-medium text-gray-700 mb-2 text-center">FGSM (Fast Gradient Sign Method) is an adversarial attack that perturbs an image using the gradient of the loss function with respect to the input image. </p>
                        <label htmlFor="epsilon" className="block text-sm font-medium text-gray-700">
                          Epsilon Value (Strength of Attack)
                        </label>
                        <Controller
                          name="epsilon"
                          control={control}
                          rules={{
                            required: "Epsilon is required",
                            min: { value: 0.01, message: "Epsilon must be at least 0.01" },
                            max: { value: 1, message: "Epsilon must be at most 1" },
                          }}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="number"
                              id="epsilon"
                              value={field.value ?? ""}
                              className="w-4/5 p-2 mt-1 border border-gray-300 rounded-md"
                              placeholder="Enter Epsilon value"
                              min="0.01"
                              max="1"
                              step="0.01"
                            />
                          )}
                        />

                        <label htmlFor="label" className="block text-sm mt-2 font-medium text-gray-700">
                          Label
                        </label>
                        <Controller
                          name="label"
                          control={control}
                          render={({ field }) => (
                            <>
                              <input
                                {...field}
                                type="text"
                                id="label"
                                disabled={isDisabled} 
                                value={query}
                                onChange={handleSearch}
                                className="w-4/5 p-2 mt-1 border border-gray-300 rounded-md"
                                placeholder="Type to search labels"
                              />
                              {/* Display filtered labels */}
                              {!isDisabled && (
                                <div className="mt-2 w-4/5">
                                  {filteredLabels.length > 0 && (
                                    <ul className="max-h-60 overflow-auto">
                                      {filteredLabels.map((label) => (
                                        <li
                                          key={label}
                                          onClick={() => handleSelectLabel(label)}
                                          className="cursor-pointer hover:bg-gray-200 p-2"
                                        >
                                          {label}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        />
                      </div>
                    )}

                    {watch('method') === "PGD" && (
                      <div className="mt-4 flex flex-col items-center justify-center">
                        <p className="text-sm font-medium text-gray-700 mb-2 text-center">PGD (Projected Gradient Descent) is an iterative attack that applies FGSM multiple times with small steps, refining the adversarial perturbation each time.</p>
                        <label htmlFor="epsilon" className="block text-sm font-medium text-gray-700">
                          Epsilon Value (Strength of Attack)
                        </label>
                        <Controller
                          name="epsilon"
                          control={control}
                          rules={{
                            required: "Epsilon is required",
                            min: { value: 0.01, message: "Epsilon must be at least 0.01" },
                            max: { value: 1, message: "Epsilon must be at most 1" },
                          }}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="number"
                              id="epsilon"
                              value={field.value ?? ""}
                              className="w-4/5 p-2 mt-1 border border-gray-300 rounded-md"
                              placeholder="Enter Epsilon value"
                              min="0.01"
                              max="1"
                              step="0.01"
                            />
                          )}
                        />
                        <label htmlFor="alpha" className="block text-sm font-medium text-gray-700">
                          Alpha (Step Size: Controls input adjustment)
                        </label>
                        <Controller
                          name="alpha"
                          control={control}
                          rules={{
                            required: "alpha is required",
                            min: { value: 0.001, message: "alpha must be at least 0.001" },
                            max: { value: 0.03, message: "alpha must be at most 0.03" },
                          }}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="number"
                              id="alpha"
                              value={field.value ?? ""}
                              className="w-4/5 p-2 mt-1 border border-gray-300 rounded-md"
                              placeholder="Enter Epsilon value"
                              min="0.01"
                              max="1"
                              step="0.01"
                            />
                          )}
                        />
                        <label htmlFor="iterations" className="block text-sm font-medium text-gray-700">
                          Iterations
                        </label>
                        <Controller
                          name="iterations"
                          control={control}
                          rules={{
                            required: "Iterations is required",
                            min: { value: 1, message: "Iterations must be at least 1" },
                            max: { value: 500, message: "Iterations must be at most 500" },
                          }}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="number"
                              id="iterations"
                              className="w-4/5 p-2 mt-1 border border-gray-300 rounded-md"
                              placeholder="Enter number of iterations"
                              value={field.value ?? ""}
                              min="1"
                              max="500"
                              step="1"
                            />
                          )}
                        />
                        
                        <label htmlFor="label" className="block text-sm mt-2 font-medium text-gray-700">
                          Label
                        </label>
                        <Controller
                          name="label"
                          control={control}
                          render={({ field }) => (
                            <>
                              <input
                                {...field}
                                type="text"
                                id="label"
                                value={query}
                                onChange={handleSearch}
                                disabled={isDisabled} 
                                className="w-4/5 p-2 mt-1 border border-gray-300 rounded-md"
                                placeholder="Type to search labels"
                              />
                              {/* Display filtered labels */}
                              {!isDisabled && (
                                <div className="mt-2 w-4/5">
                                  {filteredLabels.length > 0 && (
                                    <ul className="max-h-60 overflow-auto">
                                      {filteredLabels.map((label) => (
                                        <li
                                          key={label}
                                          onClick={() => handleSelectLabel(label)}
                                          className="cursor-pointer hover:bg-gray-200 p-2"
                                        >
                                          {label}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        />
                      </div>
                    )}

                    {watch('method') === "C&W" && (
                      <div className="mt-4 flex flex-col items-center justify-center">
                        <p className="text-sm font-medium text-gray-700 mb-2 text-center">C&W (Carlini & Wagner) is an optimization-based attack that minimizes the perturbation while still misclassifying the image.</p>
                        <label htmlFor="confidence" className="block text-sm font-medium text-gray-700">
                          Confidence
                        </label>
                        <Controller
                          name="confidence"
                          control={control}
                          rules={{
                            required: "Confidence is required",
                            min: { value: 0, message: "Confidence must be at least 1" },
                            max: { value: 10, message: "Confidence must be at most 10" },
                          }}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="number"
                              id="confidence"
                              value={field.value ?? ""}
                              className="w-4/5 p-2 mt-1 border border-gray-300 rounded-md"
                              placeholder="Enter confidence level"
                            />
                          )}
                        />

                        <label htmlFor="iterations" className="block text-sm font-medium text-gray-700">
                          Iterations
                        </label>
                        <Controller
                          name="iterations"
                          control={control}
                          rules={{
                            required: "Iterations is required",
                            min: { value: 1, message: "Iterations must be at least 1" },
                            max: { value: 500, message: "Iterations must be at most 500" },
                          }}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="number"
                              id="iterations"
                              className="w-4/5 p-2 mt-1 border border-gray-300 rounded-md"
                              placeholder="Enter number of iterations"
                              value={field.value ?? ""}
                              min="1"
                              max="500"
                              step="1"
                            />
                          )}
                        />

                        <label htmlFor="learningrate" className="block text-sm font-medium text-gray-700">
                          Learning Rate
                        </label>
                        <Controller
                          name="learningRate"
                          control={control}
                          rules={{
                            required: "Learning Rate is required",
                            min: { value: 0.001, message: "Learning Rate must be at least 0.001" },
                            max: { value: 0.01, message: "Learning Rate must be at most 0.01" },
                          }}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="number"
                              id="learningRate"
                              value={field.value ?? ""}
                              className="w-4/5 p-2 mt-1 border border-gray-300 rounded-md"
                              placeholder="Enter Learning Rate"
                              min="0.01"
                              max="1"
                              step="0.01"
                            />
                          )}
                        />

                        <label htmlFor="label" className="block text-sm mt-2 font-medium text-gray-700">
                          Label
                        </label>
                        <Controller
                          name="label"
                          control={control}
                          render={({ field }) => (
                            <>
                              <input
                                {...field}
                                type="text"
                                id="label"
                                value={query}
                                onChange={handleSearch}
                                disabled={isDisabled} 
                                className="w-4/5 p-2 mt-1 border border-gray-300 rounded-md"
                                placeholder="Type to search labels"
                              />
                              {/* Display filtered labels */}
                              {!isDisabled && (
                                <div className="mt-2 w-4/5">
                                  {filteredLabels.length > 0 && (
                                    <ul className="max-h-60 overflow-auto">
                                      {filteredLabels.map((label) => (
                                        <li
                                          key={label}
                                          onClick={() => handleSelectLabel(label)}
                                          className="cursor-pointer hover:bg-gray-200 p-2"
                                        >
                                          {label}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        />
                      </div>
                    )}

                    {watch('method') === "DeepFool" && (
                      <div className="mt-4 flex flex-col items-center justify-center">
                        <p className="text-sm font-medium text-gray-700 mb-2 text-center">DeepFool is a white-box attack that finds the minimal perturbation required to misclassify an image by iteratively approximating the decision boundary of the classifier.</p>
                        <label htmlFor="iterations" className="block text-sm font-medium text-gray-700">
                          Iterations
                        </label>
                        <Controller
                          name="iterations"
                          control={control}
                          rules={{
                            required: "Iterations is required",
                            min: { value: 1, message: "Iterations must be at least 1" },
                            max: { value: 500, message: "Iterations must be at most 500" },
                          }}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="number"
                              id="iterations"
                              className="w-4/5 p-2 mt-1 border border-gray-300 rounded-md"
                              placeholder="Enter number of iterations"
                              value={field.value ?? ""}
                              min="1"
                              max="500"
                              step="1"
                            />
                          )}
                        />

                        <label htmlFor="overshoot" className="block text-sm font-medium text-gray-700">
                          Overshoot
                        </label>
                        <Controller
                          name="overshoot"
                          control={control}
                          rules={{
                            required: "Overshoot is required",
                            min: { value: 0.001, message: "Overshoot must be at least 0.001" },
                            max: { value: 0.01, message: "Overshoot must be at most 0.01" },
                          }}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="number"
                              id="epsilon"
                              value={field.value ?? ""}
                              className="w-4/5 p-2 mt-1 border border-gray-300 rounded-md"
                              placeholder="Enter Learning Rate"
                              min="0.01"
                              max="1"
                              step="0.01"
                            />
                          )}
                        />

                        <label htmlFor="label" className="block text-sm mt-2 font-medium text-gray-700">
                          Label
                        </label>
                        <Controller
                          name="label"
                          control={control}
                          render={({ field }) => (
                            <>
                              <input
                                {...field}
                                type="text"
                                id="label"
                                value={query}
                                onChange={handleSearch}
                                disabled={isDisabled} 
                                className="w-4/5 p-2 mt-1 border border-gray-300 rounded-md"
                                placeholder="Type to search labels"
                              />
                              {/* Display filtered labels */}
                              {!isDisabled && (
                                <div className="mt-2 w-4/5">
                                  {filteredLabels.length > 0 && (
                                    <ul className="max-h-60 overflow-auto">
                                      {filteredLabels.map((label) => (
                                        <li
                                          key={label}
                                          onClick={() => handleSelectLabel(label)}
                                          className="cursor-pointer hover:bg-gray-200 p-2"
                                        >
                                          {label}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        />
                      </div>
                    )}
                  </div>
                )}
                {currentStep === 3 && (
                  <div>
                    <ul className="list-none space-y-2">
                      <li><strong>Attack Type:</strong> {watch('method')}</li>
                      <li><strong>Sample Selected:</strong> {watch('sampleSelected').toString()}</li>
                      <li><strong>Label:</strong> {watch('label')}</li>
                      <li><strong>Epsilon:</strong> {watch('epsilon')}</li>
                      <li><strong>Alpha:</strong> {watch('alpha')}</li>
                      <li><strong>Iterations:</strong> {watch('iterations')}</li>
                      <li><strong>Confidence:</strong> {watch('confidence')}</li>
                      <li><strong>Learning Rate:</strong> {watch('learningRate')}</li>
                      <li><strong>Overshoot:</strong> {watch('overshoot')}</li>
                    </ul>
                  </div>
                )}
                {currentStep === 4 && (
                  <div>
                    <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                      Analyzing:
                    </h2>
                    <ul className="max-w-md space-y-2 text-gray-500 list-inside dark:text-gray-400">
                      {["Processing Image", "Performing Attack", "Generating Prediction"].map(
                        (step, index) => (
                          <li key={index} className="flex items-center">
                            {loadingStates[index] ? (
                              // Show loading spinner and text while the step is processing
                              <>
                                <div role="status" className="flex items-center">
                                  <svg
                                    aria-hidden="true"
                                    className="w-4 h-4 me-2 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
                                    viewBox="0 0 100 101"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                                      fill="currentColor"
                                    />
                                    <path
                                      d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                                      fill="currentFill"
                                    />
                                  </svg>
                                  <span>{step}</span>
                                </div>
                              </>
                            ) : completedSteps[index] ? (
                              // Show check mark and text once the step is completed
                              <div className="flex items-center">
                                <svg
                                  className="w-4 h-4 me-2 text-green-500 dark:text-green-400 flex-shrink-0"
                                  aria-hidden="true"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z" />
                                </svg>
                                <span>{step}</span>
                              </div>
                            ) : (
                              <span>{step}</span>
                            )}
                          </li>
                        )
                      )}
                    </ul>
                    
                    {prediction && (
                      <div className="mt-4">
                        <h3>Prediction Results:</h3>
                        <p><strong>Probability of image being attacked:</strong> {(prediction.isClean * 100).toFixed(2)}%</p>
                        <p><strong>Most Likely Attack Type:</strong> {prediction.attackType}</p>
                      </div>
                    )}

                    {/* Display the attacked image here if available */}
                    {attackedImageBase64 && (
                      <div className="mt-4">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {watch('method')} Image:
                        </h3>
                        <img
                          src={`data:image/png;base64,${attackedImageBase64}`}
                          alt="Attacked"
                          className="mt-2"
                        />
                      </div>
                    )}
                  </div>
                )}
              </animated.div>
            ))}
          </animated.div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          {step > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
            >
              Previous
            </button>
          )}
          {step === 3 ? (
            <button
              type="button"
              onClick={handleSubmit(handleFormSubmit)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Submit
            </button>
          ) : (
            step < totalSteps - 1 && (
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Next
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiStepForm;


