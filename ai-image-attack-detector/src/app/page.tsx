"use client"
import { useState, useEffect, useRef } from "react";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { useTransition, animated, useSpring } from "react-spring";
import labels from './imagenet-simple-labels.json'

interface IFormInput {
  file: File[] | null;
  method: string;
  sampleSelected: boolean;
  label: string;
  labelIndex: number | null;
  epsilon: number | null;
  alpha: number | null;
  iterations: number | null;
  confidence: number | null;
  learningRate: number | null;
  overshoot: number | null;
}

const MultiStepForm = () => {
  const [step, setStep] = useState(1);
  const [prevStep, setPrevStep] = useState(1);
  const { control, handleSubmit, formState: { errors }, watch, setValue, getValues } = useForm<IFormInput>({
    defaultValues: {
      file: null,
      method: '',
      sampleSelected: false,
      label: '',
      labelIndex: null,
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
  const [isLoading, setIsLoading] = useState(false);
  var [isSampleSelected, setIsSampleSelected] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [query, setQuery] = useState(""); // State for the search query
  const [filteredLabels, setFilteredLabels] = useState(labels); // State for filtered labels
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null); // State for the selected label
  const [isDisabled, setIsDisabled] = useState(false);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchQuery = e.target.value;
    setQuery(searchQuery);

    // Filter the labels based on the search query
    const filtered = labels.filter((item) =>
      item.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredLabels(filtered);

    // Find the index of the selected label in the filtered list
    const labelIndex = labels.indexOf(searchQuery);
    setValue('labelIndex', labelIndex);
  };

  const handleSelectLabel = (label: string) => {
    setSelectedLabel(label);
    setQuery(label);  // Optionally set the input to the selected label
    setFilteredLabels([]);  // Clear filtered results once a label is selected
    setValue('label', label);  // Set the selected label in the form
    const labelIndex = labels.indexOf(label);
    setValue('labelIndex', labelIndex);
  };

  const progressProps = useSpring({
    width: `${progress}%`,
    config: { duration: 300 },
  });

  const handleNext = () => {
    setPrevStep(step);
    setStep((prev) => Math.min(prev + 1, totalSteps));
  };
  const handlePrev = () => {
    setPrevStep(step);
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFormSubmit: SubmitHandler<IFormInput> = (data) => {
    alert("Form Submitted!");
    console.log(data);
  };
  // Handle the selection of an attack method
  const handleMethodChange = (method: string) => {
    setValue("method", method);  // Update the form state with the selected attack method
    setIsLoading(true);
  };

  const handleSampleToggle = () => {
    setIsSampleSelected((prev) => {
      const newState = !prev;
      if (newState) {
        // Set label to "goldfish" when sample is selected
        setQuery("goldfish"); // Update search query
        setValue("label", "goldfish"); // Update form state label
        setValue('labelIndex', labels.indexOf('goldfish')-1);
        setIsDisabled(true)
      } else {
        // Reset the query and label when sample is deselected
        setQuery(""); 
        setValue("label", "");
        setValue('labelIndex', null);
      }
      return newState;
    });
    setValue('sampleSelected', !isSampleSelected);
  };


  // const renderImagePreview = () => {
  //   if (previewUrl && step === 2) {
  //     return (
  //         <div className="mt-4">
  //           {isLoading ? ( 
  //               <div role="status" className="flex justify-center align-center">
  //                   <svg aria-hidden="true" className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
  //                       <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
  //                       <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
  //                   </svg>
  //                   <span className="sr-only">Loading...</span>
  //               </div>
 
  //             ) : (
  //               <img
  //                 ref={imageRef}
  //                 src={previewUrl}
  //                 alt="Uploaded preview"
  //                 className="w-full object-contain border border-gray-300 rounded-md"
  //               /> 
  //             )}
  //         </div>        
  //     );
  //   }
  
  //   return null;
  // };  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (imageRef.current) {
        setContainerHeight(imageRef.current.naturalHeight+200);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [previewUrl]);

  useEffect(() => {
    // Retrieve the values directly from getValues, which gets the entire form state
    const formValues = getValues();
    
    // Set form values explicitly
    setValue('epsilon', formValues.epsilon);
    setValue('alpha', formValues.alpha);
    setValue('iterations', formValues.iterations);
    setValue('confidence', formValues.confidence);
    setValue('learningRate', formValues.learningRate);
    setValue('overshoot', formValues.overshoot);
  }, [getValues, setValue, watch('method')]);  
  useEffect(() => {
    if (step == 3) {
      setContainerHeight(350);
    }
    else {
      setContainerHeight(200);
    }
    
  }, [step, watch('method')]);

  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
    }, 1000); 
  }, [watch('method')]);

  useEffect(() => {
    // Adjust container height based on content (fields rendered)
    const timer = setTimeout(() => {
      const fieldsContainer = document.getElementById("fields-container");
      if (fieldsContainer) {
        setContainerHeight(fieldsContainer.scrollHeight + 100); // Adjust based on content height
      }
    }, 200); // Delay to ensure content is rendered
    
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
      <div className="p-6 bg-white rounded-lg shadow-lg w-full max-w-lg">
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
        <div className="relative overflow-hidden mb-4" ref={contentRef}>
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
                              value?.[0]?.size < 5 * 1024 * 1024 || "File size must be less than 5MB",
                          },
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
                            className="w-full object-contain border border-gray-300 rounded-md"
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
                              min="0.01" // Enforces minimum value at the browser level
                              max="1" // Enforces maximum value at the browser level
                              step="0.01" // Sets the increment for input values
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
                              min="0.01" // Enforces minimum value at the browser level
                              max="1" // Enforces maximum value at the browser level
                              step="0.01" // Sets the increment for input values
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
                              min="0.01" // Enforces minimum value at the browser level
                              max="1" // Enforces maximum value at the browser level
                              step="0.01" // Sets the increment for input values
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
                              min="1" // Enforces minimum value at the browser level
                              max="500" // Enforces maximum value at the browser level
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
                              min="1" // Enforces minimum value at the browser level
                              max="500" // Enforces maximum value at the browser level
                              step="1"
                            />
                          )}
                        />

                        <label htmlFor="learningrate" className="block text-sm font-medium text-gray-700">
                          Learning Rate
                        </label>
                        <Controller
                          name="learningrate"
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
                              id="epsilon"
                              value={field.value ?? ""}
                              className="w-4/5 p-2 mt-1 border border-gray-300 rounded-md"
                              placeholder="Enter Learning Rate"
                              min="0.01" // Enforces minimum value at the browser level
                              max="1" // Enforces maximum value at the browser level
                              step="0.01" // Sets the increment for input values
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
                              min="1" // Enforces minimum value at the browser level
                              max="500" // Enforces maximum value at the browser level
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
                              min="0.01" // Enforces minimum value at the browser level
                              max="1" // Enforces maximum value at the browser level
                              step="0.01" // Sets the increment for input values
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
                      <li><strong>Label Index:</strong> {watch('labelIndex')}</li>
                      <li><strong>Epsilon:</strong> {watch('epsilon')}</li>
                      <li><strong>Alpha:</strong> {watch('alpha')}</li>
                      <li><strong>Iterations:</strong> {watch('iterations')}</li>
                      <li><strong>Confidence:</strong> {watch('confidence')}</li>
                      <li><strong>Learning Rate:</strong> {watch('learningRate')}</li>
                      <li><strong>Overshoot:</strong> {watch('overshoot')}</li>
                    </ul>
                  </div>
                )}
              </animated.div>
            ))}
          </animated.div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          {step > 1 && (
            <button type="button" onClick={handlePrev} className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400">Previous</button>
          )}
          {step < totalSteps ? (
            <button type="button" onClick={handleNext} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Next</button>
          ) : (
            <button type="submit" onClick={handleSubmit(handleFormSubmit)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Submit</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiStepForm;

