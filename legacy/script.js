document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------
    // Tab Switching Logic
    // -------------------------------------------------------------
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active classes
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked button
            btn.classList.add('active');
            
            // Show corresponding content
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // -------------------------------------------------------------
    // Image Segmentation Dummy Process
    // -------------------------------------------------------------
    const uploadArea = document.getElementById('upload-area');
    const imageInput = document.getElementById('image-input');
    const uploadBtn = document.getElementById('upload-btn');
    const fileNameDisplay = document.getElementById('file-name');
    const processImageBtn = document.getElementById('process-image-btn');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const imageResultArea = document.getElementById('image-result-area');
    const imageResult = document.getElementById('image-result');

    // Handle button click for file upload
    uploadBtn.addEventListener('click', () => {
        imageInput.click();
    });

    // Handle Drag & Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.remove('dragover');
        }, false);
    });

    uploadArea.addEventListener('drop', (e) => {
        let dt = e.dataTransfer;
        let files = dt.files;
        handleFiles(files);
    });

    // Handle File Input Change
    imageInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        if (files && files.length > 0) {
            const file = files[0];
            
            // Ensure it's an image
            if (!file.type.startsWith('image/')) {
                alert('Please upload an image file (e.g., JPG, PNG).');
                return;
            }

            fileNameDisplay.textContent = file.name;
            processImageBtn.disabled = false;

            // Display Image Preview
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                imagePreviewContainer.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
            
            // Hide previous result
            imageResultArea.classList.add('hidden');
            
            // Remove previous result classes to restart animation
            imageResult.className = 'result-box';
        }
    }

    // Process Image Button Click
    processImageBtn.addEventListener('click', async () => {
        processImageBtn.disabled = true;
        processImageBtn.innerHTML = '<span class="loading-spinner"></span> Processing...';
        imageResultArea.classList.add('hidden');

        // Playful simulation of processing time (1.5 seconds)
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Generate dummy Yes/No answer randomly
        const isYes = Math.random() > 0.5;
        
        // Show result
        imageResult.textContent = isYes ? 'YES' : 'NO';
        imageResult.className = 'result-box ' + (isYes ? 'yes' : 'no');
        
        imageResultArea.classList.remove('hidden');

        // Reset button
        processImageBtn.innerHTML = 'Process Image';
        processImageBtn.disabled = false;
    });

    // -------------------------------------------------------------
    // NLP Dummy Process
    // -------------------------------------------------------------
    const textInput = document.getElementById('text-input');
    const processTextBtn = document.getElementById('process-text-btn');
    const textResultArea = document.getElementById('text-result-area');
    const textResult = document.getElementById('text-result');

    // Process Text Button Click
    processTextBtn.addEventListener('click', async () => {
        const text = textInput.value.trim();
        
        // Validate input
        if (!text) {
            // Temporary highlight effect
            textInput.style.borderColor = '#f87171';
            textInput.style.boxShadow = '0 0 0 3px rgba(248, 113, 113, 0.2)';
            setTimeout(() => {
                textInput.style.borderColor = '';
                textInput.style.boxShadow = '';
            }, 1000);
            
            return;
        }

        processTextBtn.disabled = true;
        processTextBtn.innerHTML = '<span class="loading-spinner"></span> Processing...';
        textResultArea.classList.add('hidden');

        // Playful simulation of processing time based lightly on text length
        const processTime = Math.min(800 + (text.length * 10), 2500); 
        await new Promise(resolve => setTimeout(resolve, processTime));

        // Generate dummy Yes/No answer randomly
        const isYes = Math.random() > 0.5;

        // Show result
        textResult.textContent = isYes ? 'YES' : 'NO';
        textResult.className = 'result-box ' + (isYes ? 'yes' : 'no');
        textResultArea.classList.remove('hidden');

        // Reset button
        processTextBtn.innerHTML = 'Process Text';
        processTextBtn.disabled = false;
    });
});
