// DOM 元素
const promptInput = document.getElementById('promptInput');
const generateBtn = document.getElementById('generateBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const imageResult = document.getElementById('imageResult');
const imageGrid = document.getElementById('imageGrid');
const downloadBtn = document.getElementById('downloadBtn');
const regenerateBtn = document.getElementById('regenerateBtn');
const examplesSection = document.getElementById('examplesSection');

// 设置元素
const imageSize = document.getElementById('imageSize');
const imageCount = document.getElementById('imageCount');
const styleStrength = document.getElementById('styleStrength');

// API 配置
// 注意：在生产环境中，API 密钥应该存储在服务器端
// 这里仅用于演示目的
const STABILITY_API_KEY = 'sk-gfvtcbgNpSWCuitsue6myXg8CZrsTAGviLyHK0lbtp4cEnaj';
const STABILITY_API_URL = 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image';

// 速率限制配置
const RATE_LIMIT = 50; // 每小时限制次数，增加到50次
const RATE_LIMIT_KEY = 'generation_count';
const RATE_LIMIT_RESET_KEY = 'generation_reset_time';

// 工具函数
function checkRateLimit() {
    const now = Date.now();
    const resetTime = localStorage.getItem(RATE_LIMIT_RESET_KEY) || now;
    let count = parseInt(localStorage.getItem(RATE_LIMIT_KEY) || '0');

    if (now > parseInt(resetTime)) {
        // 更新重置时间并清零计数
        count = 0;
        localStorage.setItem(RATE_LIMIT_RESET_KEY, now + 3600000);
    }

    if (count >= RATE_LIMIT) {
        // 达到限制时提供更友好的消息并仍使用备选方案
        console.warn(`已达到每小时生成限制(${RATE_LIMIT}次)，将使用备选方案`);
        return false;
    }

    localStorage.setItem(RATE_LIMIT_KEY, count + 1);
    return true;
}

function clearPrompt() {
    promptInput.value = '';
    promptInput.focus();
}

function showExamples() {
    examplesSection.classList.toggle('hidden');
}

function useExample(prompt) {
    promptInput.value = prompt;
    examplesSection.classList.add('hidden');
    promptInput.focus();
}

// 移动导航滚动功能
function scrollToSection(selector) {
    const section = document.querySelector(selector);
    if (section) {
        window.scrollTo({
            top: section.offsetTop - 20,
            behavior: 'smooth'
        });
        
        // 更新底部导航激活状态
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const currentBtn = Array.from(document.querySelectorAll('.nav-btn')).find(
            btn => btn.getAttribute('onclick').includes(selector)
        );
        
        if (currentBtn) {
            currentBtn.classList.add('active');
        }
    }
}

// 全屏加载效果
const fullScreenLoading = document.getElementById('fullScreenLoading');

// 显示和隐藏加载动画的辅助函数
function showLoading() {
    if (fullScreenLoading) {
        fullScreenLoading.style.display = 'flex';
        fullScreenLoading.style.visibility = 'visible';
        fullScreenLoading.classList.remove('hidden');
        fullScreenLoading.classList.add('active');
        // 强制重绘DOM以确保样式生效
        setTimeout(() => {
            fullScreenLoading.style.opacity = '1';
        }, 10);
    }
}

function hideLoading() {
    if (fullScreenLoading) {
        fullScreenLoading.classList.remove('active');
        fullScreenLoading.classList.add('hidden');
        fullScreenLoading.style.display = 'none';
        fullScreenLoading.style.visibility = 'hidden';
        fullScreenLoading.style.opacity = '0';
    }
}

// 处理 API 错误的函数
function handleApiError(error) {
    console.error('API调用错误:', error);
    
    // 检测内容审核错误
    if (error.message && (
        error.message.includes('content moderation') || 
        error.message.includes('flagged') ||
        error.message.includes('不适当内容')
    )) {
        alert('内容审核未通过: ' + error.message + '\n\n请修改您的描述，避免使用可能被系统判定为敏感的词汇。');
        return;
    }
    
    // 检测是否是CORS错误
    if (error.message && (
        error.message.includes('CORS') || 
        error.message.includes('cross-origin') ||
        error.message.includes('access-control-allow-origin')
    )) {
        alert('跨域请求被阻止。请尝试以下方法解决：\n\n1. 安装浏览器CORS插件\n2. 使用本地代理服务器\n3. 点击"测试"按钮使用模拟图片');
    } else {
        alert(`生成图片失败: ${error.message}`);
    }
}

// 增强版生成图片函数
async function generateImage() {
    let prompt = promptInput.value.trim();
    
    if (!prompt) {
        alert('请输入图片描述');
        return;
    }

    try {
        // 检查速率限制
        const canUseApi = checkRateLimit();

        // 设置UI状态
        generateBtn.disabled = true;
        loadingIndicator.classList.remove('hidden');
        showLoading(); // 使用辅助函数
        imageResult.classList.add('hidden');

        // 获取设置
        const sizeValue = imageSize.value;
        const count = parseInt(imageCount.value);
        const strength = styleStrength.value / 100 * 15; // 转换为 0-15 范围

        // 振动反馈（如果支持）
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }

        // 如果达到速率限制，使用备选方案
        if (!canUseApi) {
            setTimeout(() => {
                handleApiFailure(prompt, count);
                generateBtn.disabled = false;
                loadingIndicator.classList.add('hidden');
                hideLoading();
            }, 1000);
            return;
        }

        // 预处理提示词，添加正面提示和过滤敏感内容的提示词
        prompt = `${prompt}, digital artwork, high quality, detailed, clean image`;
        
        // 提取尺寸
        const [width, height] = sizeValue.split('x').map(Number);
        
        // 准备 API 请求
        const apiData = {
            text_prompts: [
                {
                    text: prompt,
                    weight: 1
                },
                {
                    text: "nsfw, nude, naked, sex, porn, explicit content, violence, gore, bloody, scary, disturbing, offensive, disgusting, blurry, low quality",
                    weight: -1
                }
            ],
            cfg_scale: 7 + (strength / 3), // 在 7-12 之间调整 CFG 值
            height: height,
            width: width,
            samples: count,
            steps: 30,
            style_preset: "photographic"
        };

        try {
            console.log('正在调用API: ', STABILITY_API_URL);
            console.log('请求数据: ', JSON.stringify(apiData));
            
            // 调用 Stability.ai API
            const response = await fetch(STABILITY_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${STABILITY_API_KEY}`
                },
                body: JSON.stringify(apiData)
            });

            console.log('API响应状态: ', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API错误响应: ', errorText);
                
                let errorData = {};
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    // 无法解析JSON
                }
                
                // 如果是内容审核问题，显示更友好的提示
                if (errorText.includes("content moderation") || errorText.includes("flagged")) {
                    throw new Error('您的请求被内容审核系统标记为不适当内容。请修改描述并重试，避免敏感词汇。');
                } else {
                    throw new Error(errorData.message || `API请求失败: ${response.status}`);
                }
            }

            const data = await response.json();
            console.log('API响应数据: ', data);
            
            // 显示生成的图片
            imageGrid.innerHTML = '';
            
            if (data.artifacts && Array.isArray(data.artifacts)) {
                data.artifacts.forEach((artifact, index) => {
                    const imgContainer = document.createElement('div');
                    imgContainer.className = 'image-item';
                    
                    // 创建图片 URL
                    const imageUrl = `data:image/png;base64,${artifact.base64}`;
                    
                    imgContainer.innerHTML = `
                        <img src="${imageUrl}" alt="生成的图片 ${index + 1}" loading="lazy">
                        <p>${promptInput.value.trim()}</p>
                    `;
                    imageGrid.appendChild(imgContainer);
                });

                imageResult.classList.remove('hidden');
                downloadBtn.classList.remove('hidden');
                regenerateBtn.classList.remove('hidden');
            } else {
                throw new Error('API返回数据格式错误');
            }
            
            // 滚动到结果区域（在移动设备上）
            if (window.innerWidth <= 768) {
                scrollToSection('.result-section');
            }
            
        } catch (apiError) {
            console.error('API调用错误:', apiError);
            handleApiError(apiError); // 使用新的错误处理函数
            // 如果API调用失败，使用模拟图片（仅用于演示）
            handleApiFailure(promptInput.value.trim(), count);
        }

    } catch (error) {
        console.error('生成失败:', error);
        alert('生成失败：' + error.message);
        // 出错时也使用备选方案
        const prompt = promptInput.value.trim();
        const count = parseInt(imageCount.value);
        handleApiFailure(prompt, count);
    } finally {
        generateBtn.disabled = false;
        loadingIndicator.classList.add('hidden');
        hideLoading(); // 使用辅助函数
    }
}

// 处理 API 失败的备选方案（仅用于演示）
function handleApiFailure(prompt, count) {
    console.log('使用备选方案');
    
    // 直接调用模拟图片生成函数保持一致性
    generateMockImages(prompt, count);
}

// 添加用于测试的模拟生成功能 - 跳过API调用
function mockGenerateImage() {
    const prompt = promptInput.value.trim() || "测试生成图片";
    const count = parseInt(imageCount.value);
    
    // 显示加载状态以模拟生成过程
    generateBtn.disabled = true;
    loadingIndicator.classList.remove('hidden');
    showLoading(); // 使用辅助函数
    imageResult.classList.add('hidden');
    
    // 清除任何可能存在的速率限制记录
    localStorage.removeItem(RATE_LIMIT_KEY);
    localStorage.removeItem(RATE_LIMIT_RESET_KEY);
    
    // 模拟API延迟
    setTimeout(() => {
        // 使用模拟图片
        generateMockImages(prompt, count);
        
        // 隐藏加载状态
        generateBtn.disabled = false;
        loadingIndicator.classList.add('hidden');
        hideLoading();
        
        // 如果是移动设备，滚动到结果区域
        if (window.innerWidth <= 768) {
            scrollToSection('.result-section');
        }
    }, 1500); // 适当的延迟以模拟生成过程
}

// 生成模拟图片
function generateMockImages(prompt, count) {
    console.log('使用模拟图片');
    
    imageGrid.innerHTML = '';
    const imageTypes = ['nature', 'people', 'architecture', 'animals', 'technology'];
    
    for (let i = 0; i < count; i++) {
        const imgContainer = document.createElement('div');
        imgContainer.className = 'image-item';
        
        // 使用更多样化的随机图片
        const randomCategory = imageTypes[Math.floor(Math.random() * imageTypes.length)];
        const width = 800;
        const height = 800;
        const randomNum = Date.now() + i;
        
        imgContainer.innerHTML = `
            <img src="https://picsum.photos/seed/${randomNum}/${width}/${height}" alt="生成的图片">
            <p>${prompt}</p>
            <div class="image-badge">模拟图片</div>
        `;
        imageGrid.appendChild(imgContainer);
    }

    imageResult.classList.remove('hidden');
    downloadBtn.classList.remove('hidden');
    regenerateBtn.classList.remove('hidden');
}

function downloadImage() {
    const images = imageGrid.querySelectorAll('img');
    images.forEach((img, index) => {
        const link = document.createElement('a');
        link.download = `generated-image-${index + 1}.png`;
        link.href = img.src;
        link.click();
    });
}

function regenerateImage() {
    generateImage();
}

// 事件监听
document.querySelector('form')?.addEventListener('submit', (e) => {
    e.preventDefault();
});

// 风格强度滑块事件监听
const strengthValue = document.getElementById('strengthValue');
styleStrength.addEventListener('input', (e) => {
    const value = e.target.value;
    strengthValue.textContent = `${value}%`;
    e.target.style.background = `linear-gradient(to right, #3498db 0%, #3498db ${value}%, #ddd ${value}%, #ddd 100%)`;
});

// 图片点击预览
document.addEventListener('click', (e) => {
    const target = e.target;
    if (target.tagName === 'IMG' && target.parentElement.classList.contains('image-item')) {
        target.classList.toggle('preview-mode');
        
        if (target.classList.contains('preview-mode')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
});

// 检测设备方向变化，并重新调整布局
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        styleStrength.dispatchEvent(new Event('input'));
    }, 300);
});

// 检查页面加载时是否有未关闭的加载指示器
document.addEventListener('DOMContentLoaded', function() {
    // 立即隐藏加载动画
    hideLoading();
    loadingIndicator.classList.add('hidden');
    generateBtn.disabled = false;
});

window.addEventListener('load', () => {
    // 初始化滑块
    styleStrength.dispatchEvent(new Event('input'));
    
    // 确保加载指示器是隐藏的
    hideLoading();
    loadingIndicator.classList.add('hidden');
    generateBtn.disabled = false;
    
    // 检测深色模式变化
    if (window.matchMedia) {
        const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        if (colorSchemeQuery.matches) {
            document.body.classList.add('dark-mode');
        }
        
        colorSchemeQuery.addEventListener('change', (e) => {
            if (e.matches) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        });
    }
    
    // 为移动设备调整视口高度
    function adjustViewport() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    
    // 初始调整和监听尺寸变化
    adjustViewport();
    window.addEventListener('resize', adjustViewport);
    
    // 检测是否为移动设备并添加相应类
    if (/Mobi|Android/i.test(navigator.userAgent)) {
        document.body.classList.add('mobile-device');
    }
});

// 添加一个调试函数，用于手动强制更新页面
function forceRefresh() {
    // 清除正在加载状态
    loadingIndicator.classList.add('hidden');
    hideLoading(); // 使用辅助函数
    generateBtn.disabled = false;
    
    // 刷新滑块
    styleStrength.dispatchEvent(new Event('input'));
    
    // 重新调整视口
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    
    // 如果结果区域为空，直接生成图片
    if (imageGrid.children.length === 0) {
        // 确保有一个默认提示词
        if (!promptInput.value.trim()) {
            promptInput.value = "测试生成图片";
        }
        generateImage();
    }
} 