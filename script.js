let IMAGES = [];
let IMAGE_EXTENSION = 'png'; // Default extension
let SPECIAL_IMAGES = {}; // Special images configuration: {key: {image, probability, minCount}}
let SPECIAL_COUNTERS = {}; // Counters for special images: {key: count}
let IMAGES_PER_ROW = 6; // Default images per row
let IMAGES_PER_ROW_MOBILE = 3; // Default images per row on mobile
let IMAGE_MASK_MAP = {}; // Map: imageName -> maskSetName

// Fixed mask sets (defined in CSS)
const MASK_SETS = {
    "3syllables": [
        'mask-left-third',
        'mask-middle-third',
        'mask-right-third',
        'mask-left-two-thirds',
        'mask-right-two-thirds',
        'mask-full'
    ],
    "4syllables": [
        'mask-9-1',  // 只遮住右邊3/4
        'mask-9-2',  // 遮住左邊1/4和右邊1/2
        'mask-9-3',  // 遮住左邊1/2和右邊1/4
        'mask-9-4',  // 只遮住左邊3/4
        'mask-9-5',  // 遮住左半1/2
        'mask-9-6',  // 遮住右半1/2
        'mask-9-7',  // 只遮住左右兩邊的1/4
        'mask-9-8',  // 遮住左邊1/4
        'mask-9-9'   // 遮住右邊1/4
    ]
};

const imageGrid = document.getElementById('imageGrid');
let visibleCount = 0;

// Get buttons and counter
const revealBtn = document.getElementById('revealBtn');
const revealBtnM = document.getElementById('revealBtnM');
const resetBtn = document.getElementById('resetBtn');
const hintBtn = document.getElementById('hintBtn');
const counter = document.getElementById('counter');
const imageSelectorLeft = document.getElementById('imageSelectorLeft');
const imageSelectorRight = document.getElementById('imageSelectorRight');
const hintOverlay = document.getElementById('hintOverlay');
const hintClose = document.getElementById('hintClose');
const hintImages = document.getElementById('hintImages');

// Fetch images list from images.json
fetch('images.json')
    .then(response => response.json())
    .then(data => {
        console.log('📦 讀取 images.json:', data);
        
        // Load extension and special images
        IMAGE_EXTENSION = data.extension || 'png';
        IMAGES_PER_ROW = data.imagesPerRow || 6;
        IMAGES_PER_ROW_MOBILE = data.imagesPerRowMobile || 3;
        
        // Load special images configuration
        SPECIAL_IMAGES = data.specialImages || {};
        
        // Initialize counters for all special images
        for (const key in SPECIAL_IMAGES) {
            SPECIAL_COUNTERS[key] = 0;
        }
        
        // Flatten images from all mask sets and build map
        IMAGES = [];
        IMAGE_MASK_MAP = {};
        
        for (const [maskSetName, imageList] of Object.entries(data.images)) {
            for (const imageName of imageList) {
                IMAGES.push(imageName);
                IMAGE_MASK_MAP[imageName] = maskSetName;
            }
        }
        
        console.log('✅ 副檔名:', IMAGE_EXTENSION);
        console.log('✅ 每行圖片數:', IMAGES_PER_ROW);
        console.log('✅ 手機版每行圖片數:', IMAGES_PER_ROW_MOBILE);
        console.log('✅ 特殊圖片配置:', SPECIAL_IMAGES);
        console.log('✅ 圖片列表:', IMAGES);
        console.log('✅ 圖片-Mask 對應:', IMAGE_MASK_MAP);
        
        // Set CSS variables for images per row
        document.documentElement.style.setProperty('--images-per-row', IMAGES_PER_ROW);
        document.documentElement.style.setProperty('--images-per-row-mobile', IMAGES_PER_ROW_MOBILE);
        
        initializeGame();
    })
    .catch(error => {
        console.error('❌ Error loading images.json:', error);
        alert('無法載入 images.json，請確認：\n1. 檔案存在\n2. 使用本地伺服器（如 npx http-server）\n3. JSON 格式正確');
    });

function initializeGame() {
    console.log('🎮 初始化遊戲...');
    console.log('   副檔名:', IMAGE_EXTENSION);
    console.log('   圖片數量:', IMAGES.length);
    
    // Generate image buttons dynamically
    const halfLength = Math.ceil(IMAGES.length / 2);
    
    IMAGES.forEach((imageName, index) => {
        const button = document.createElement('button');
        button.className = 'image-btn';
        button.dataset.image = `${imageName}.${IMAGE_EXTENSION}`;
        
        const img = document.createElement('img');
        img.src = `${imageName}.${IMAGE_EXTENSION}`;
        img.alt = imageName;
        
        // Debug first image
        if (index === 0) {
            console.log('🖼️ 第一張圖片路徑:', img.src);
        }
        
        button.appendChild(img);
        
        // Place first half in left selector, second half in right selector
        if (index < halfLength) {
            imageSelectorLeft.appendChild(button);
        } else {
            imageSelectorRight.appendChild(button);
        }
    });

    // Now get all generated image buttons
    const imageButtons = document.querySelectorAll('.image-btn');

    // Load selected images from localStorage (default to first image)
    let savedSelectedImages = localStorage.getItem('selectedImages');
    let selectedImages = savedSelectedImages ? JSON.parse(savedSelectedImages) : [`${IMAGES[0]}.${IMAGE_EXTENSION}`];

    // Load state from localStorage
    let savedImages = localStorage.getItem('revealedImages');
    let savedCounters = localStorage.getItem('specialCounters');
    
    let revealedImages = savedImages ? JSON.parse(savedImages) : [];
    
    // Load special counters from localStorage or initialize to 0
    if (savedCounters) {
        const parsedCounters = JSON.parse(savedCounters);
        for (const key in SPECIAL_IMAGES) {
            SPECIAL_COUNTERS[key] = parsedCounters[key] || 0;
        }
    }

    // Function to create and add image item
    function createImageItem(index, isReverse, maskClass, imageSrc) {
        const imageItem = document.createElement('div');
        imageItem.className = 'image-item visible';
        imageItem.dataset.index = index;
        
        // Apply mask class
        imageItem.classList.add(maskClass);
        
        // Create image
        const img = document.createElement('img');
        img.src = imageSrc;
        img.alt = `image ${index + 1}`;
        img.className = 'placeholder';
        
        imageItem.appendChild(img);
        imageGrid.appendChild(imageItem);
    }

    // Update counter display
    function updateCounter() {
        counter.textContent = visibleCount.toString();
    }

    // Get random image from selected images
    function getRandomSelectedImage() {
        const randomIndex = Math.floor(Math.random() * selectedImages.length);
        return selectedImages[randomIndex];
    }

    // Restore revealed images from localStorage
    revealedImages.forEach((imgData, index) => {
        createImageItem(index, imgData.isReverse, imgData.maskClass, imgData.imageSrc);
    });
    
    visibleCount = revealedImages.length;
    updateCounter();

    // Set active state for selected images
    imageButtons.forEach(btn => {
        if (selectedImages.includes(btn.dataset.image)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Image button click handlers - toggle selection
    imageButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Only allow selection changes when no images have been revealed
            if (visibleCount > 0) {
                return; // Don't allow changes if images exist
            }
            
            const imageName = btn.dataset.image;
            
            // Toggle selection
            if (selectedImages.includes(imageName)) {
                // If it's the only selected image, don't allow deselection
                if (selectedImages.length > 1) {
                    selectedImages = selectedImages.filter(img => img !== imageName);
                    btn.classList.remove('active');
                }
            } else {
                selectedImages.push(imageName);
                btn.classList.add('active');
            }
            
            // Save to localStorage
            localStorage.setItem('selectedImages', JSON.stringify(selectedImages));
        });
    });

    // Reveal button click handler
    revealBtn.addEventListener('click', () => {
        let triggeredSpecial = null;
        let maskClass;
        let imageSrc;
        
        // Check all special images to see if any should be triggered
        for (const [key, config] of Object.entries(SPECIAL_IMAGES)) {
            if (SPECIAL_COUNTERS[key] >= config.minCount) {
                // Random chance to trigger this special image
                if (Math.random() < config.probability) {
                    triggeredSpecial = key;
                    break; // Stop at first triggered special image
                }
            }
        }
        
        if (triggeredSpecial) {
            // Show triggered special image with mask-full
            const config = SPECIAL_IMAGES[triggeredSpecial];
            maskClass = 'mask-full';
            imageSrc = `${config.image}.${IMAGE_EXTENSION}`;
            
            // Reset this special's counter
            SPECIAL_COUNTERS[triggeredSpecial] = 0;
            
            // Increment all other counters
            for (const key in SPECIAL_COUNTERS) {
                if (key !== triggeredSpecial) {
                    SPECIAL_COUNTERS[key]++;
                }
            }
            
            console.log(`🎉 觸發特殊圖片: ${triggeredSpecial} (${config.image})`);
        } else {
            // Get random image from selected images
            imageSrc = getRandomSelectedImage();
            
            // Get image name without extension
            const imageName = imageSrc.replace(`.${IMAGE_EXTENSION}`, '');
            
            // Find which mask set this image uses
            const maskSetName = IMAGE_MASK_MAP[imageName];
            const availableMasks = MASK_SETS[maskSetName] || MASK_SETS["3syllables"];
            
            // Choose random mask from the appropriate set
            maskClass = availableMasks[Math.floor(Math.random() * availableMasks.length)];
            
            console.log(`🎲 圖片: ${imageName}, Mask集合: ${maskSetName}, 選中: ${maskClass}`);
            
            // Increment all special counters
            for (const key in SPECIAL_COUNTERS) {
                SPECIAL_COUNTERS[key]++;
            }
        }
        
        // Create new image item
        createImageItem(visibleCount, triggeredSpecial !== null, maskClass, imageSrc);
        
        // Save to revealedImages
        revealedImages.push({
            isReverse: triggeredSpecial !== null,
            maskClass: maskClass,
            imageSrc: imageSrc
        });
        
        visibleCount++;
        
        // Save to localStorage
        localStorage.setItem('revealedImages', JSON.stringify(revealedImages));
        localStorage.setItem('specialCounters', JSON.stringify(SPECIAL_COUNTERS));
        
        updateCounter();
    });


    // Reveal button click handler
    revealBtnM.addEventListener('click', () => {
        let triggeredSpecial = null;
        let maskClass;
        let imageSrc;
        
        // Check all special images to see if any should be triggered
        for (const [key, config] of Object.entries(SPECIAL_IMAGES)) {
            if (SPECIAL_COUNTERS[key] >= config.minCount) {
                // Random chance to trigger this special image
                if (Math.random() < config.probability) {
                    triggeredSpecial = key;
                    break; // Stop at first triggered special image
                }
            }
        }
        
        if (triggeredSpecial) {
            // Show triggered special image with mask-full
            const config = SPECIAL_IMAGES[triggeredSpecial];
            maskClass = 'mask-full';
            imageSrc = `${config.image}.${IMAGE_EXTENSION}`;
            
            // Reset this special's counter
            SPECIAL_COUNTERS[triggeredSpecial] = 0;
            
            // Increment all other counters
            for (const key in SPECIAL_COUNTERS) {
                if (key !== triggeredSpecial) {
                    SPECIAL_COUNTERS[key]++;
                }
            }
            
            console.log(`🎉 觸發特殊圖片: ${triggeredSpecial} (${config.image})`);
        } else {
            // Get random image from selected images
            imageSrc = getRandomSelectedImage();
            
            // Get image name without extension
            const imageName = imageSrc.replace(`.${IMAGE_EXTENSION}`, '');
            
            // Find which mask set this image uses
            const maskSetName = IMAGE_MASK_MAP[imageName];
            const availableMasks = MASK_SETS[maskSetName] || MASK_SETS["3syllables"];
            
            // Choose random mask from the appropriate set
            maskClass = availableMasks[Math.floor(Math.random() * availableMasks.length)];
            
            console.log(`🎲 圖片: ${imageName}, Mask集合: ${maskSetName}, 選中: ${maskClass}`);
            
            // Increment all special counters
            for (const key in SPECIAL_COUNTERS) {
                SPECIAL_COUNTERS[key]++;
            }
        }
        
        // Create new image item
        createImageItem(visibleCount, triggeredSpecial !== null, maskClass, imageSrc);
        
        // Save to revealedImages
        revealedImages.push({
            isReverse: triggeredSpecial !== null,
            maskClass: maskClass,
            imageSrc: imageSrc
        });
        
        visibleCount++;
        
        // Save to localStorage
        localStorage.setItem('revealedImages', JSON.stringify(revealedImages));
        localStorage.setItem('specialCounters', JSON.stringify(SPECIAL_COUNTERS));
        
        updateCounter();
    });

    // Reset button click handler
    resetBtn.addEventListener('click', () => {
        // Clear localStorage EXCEPT selectedImages
        localStorage.removeItem('revealedImages');
        localStorage.removeItem('specialCounters');
        // Keep selectedImages in localStorage
        
        // Reload the page to reset everything
        location.reload();
    });

    // Generate hint images
    IMAGES.forEach((imageName) => {
        const hintItem = document.createElement('div');
        hintItem.className = 'hint-image-item';
        
        const img = document.createElement('img');
        img.src = `${imageName}.${IMAGE_EXTENSION}`;
        img.alt = imageName;
        
        hintItem.appendChild(img);
        hintImages.appendChild(hintItem);
    });

    // Hint button toggle
    hintBtn.addEventListener('click', () => {
        hintOverlay.classList.toggle('active');
    });

    // Close hint overlay
    hintClose.addEventListener('click', () => {
        hintOverlay.classList.remove('active');
    });

    // Close hint overlay when clicking outside
    hintOverlay.addEventListener('click', (e) => {
        if (e.target === hintOverlay) {
            hintOverlay.classList.remove('active');
        }
    });

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        // ENTER or SPACE key triggers GO button
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            revealBtn.click();
        }
        
        // ESC key triggers reset button
        if (e.key === 'Escape') {
            e.preventDefault();
            resetBtn.click();
        }
    });
}