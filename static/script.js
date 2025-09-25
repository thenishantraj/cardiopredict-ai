class CardioPredictApp {
    constructor() {
        this.videoElement = document.getElementById('videoElement');
        this.canvasElement = document.getElementById('canvasElement');
        this.startBtn = document.getElementById('startBtn');
        this.demoBtn = document.getElementById('demoBtn');
        this.restartBtn = document.getElementById('restartBtn');
        this.resultsSection = document.getElementById('resultsSection');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        
        this.isAnalyzing = false;
        this.mediaStream = null;
        this.frames = [];
        
        this.initializeEventListeners();
        this.initializeCamera();
    }
    
    initializeEventListeners() {
        this.startBtn.addEventListener('click', () => this.startAnalysis());
        this.demoBtn.addEventListener('click', () => this.runDemo());
        this.restartBtn.addEventListener('click', () => this.restartAnalysis());
    }
    
    async initializeCamera() {
        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: 640, 
                    height: 480,
                    facingMode: 'user' 
                } 
            });
            this.videoElement.srcObject = this.mediaStream;
        } catch (error) {
            console.error('Error accessing camera:', error);
            this.showError('Cannot access camera. Please ensure you have granted camera permissions.');
        }
    }
    
    async startAnalysis() {
        if (this.isAnalyzing) return;
        
        this.isAnalyzing = true;
        this.frames = [];
        this.showLoading(true);
        
        try {
            // Capture frames for 10 seconds
            await this.captureFrames(10000);
            
            // Send frames to backend for analysis
            const result = await this.sendForAnalysis();
            
            // Display results
            this.displayResults(result);
            
        } catch (error) {
            console.error('Analysis error:', error);
            this.showError('Analysis failed. Please try again.');
        } finally {
            this.isAnalyzing = false;
            this.showLoading(false);
        }
    }
    
    async captureFrames(duration) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const interval = setInterval(() => {
                if (Date.now() - startTime >= duration) {
                    clearInterval(interval);
                    resolve();
                    return;
                }
                
                this.captureFrame();
            }, 100); // Capture every 100ms (10 FPS)
        });
    }
    
    captureFrame() {
        const context = this.canvasElement.getContext('2d');
        this.canvasElement.width = this.videoElement.videoWidth;
        this.canvasElement.height = this.videoElement.videoHeight;
        
        context.drawImage(this.videoElement, 0, 0);
        const imageData = this.canvasElement.toDataURL('image/jpeg', 0.8);
        this.frames.push(imageData);
    }
    
    async sendForAnalysis() {
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                video_data: this.frames
            })
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        return await response.json();
    }
    
    async runDemo() {
        this.showLoading(true);
        
        try {
            const response = await fetch('/quick_demo');
            const result = await response.json();
            
            // Simulate processing delay
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            this.displayResults(result);
            
        } catch (error) {
            console.error('Demo error:', error);
            this.showError('Demo failed. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }
    
    displayResults(result) {
        if (!result.success) {
            this.showError(result.error);
            return;
        }
        
        // Update vital signs
        document.getElementById('heartRate').textContent = result.heart_rate;
        document.getElementById('hrvValue').textContent = result.hrv;
        document.getElementById('riskLevel').textContent = result.risk_level;
        document.getElementById('riskScore').textContent = `${result.risk_score}%`;
        
        // Update risk level styling
        const riskScoreElement = document.getElementById('riskScore');
        riskScoreElement.className = 'risk-score';
        
        if (result.risk_level === 'Low') {
            riskScoreElement.classList.add('risk-low');
            document.querySelector('.risk-card .vital-icon').textContent = '✅';
        } else if (result.risk_level === 'Moderate') {
            riskScoreElement.classList.add('risk-moderate');
            document.querySelector('.risk-card .vital-icon').textContent = '⚠️';
        } else {
            riskScoreElement.classList.add('risk-high');
            document.querySelector('.risk-card .vital-icon').textContent = '🚨';
        }
        
        // Update recommendations
        const recommendationsList = document.getElementById('recommendationsList');
        recommendationsList.innerHTML = '';
        
        result.recommendations.forEach(rec => {
            const li = document.createElement('li');
            li.textContent = rec;
            recommendationsList.appendChild(li);
        });
        
        // Draw waveform
        this.drawWaveform(result.waveform_data);
        
        // Show results section
        this.resultsSection.style.display = 'block';
        this.resultsSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    drawWaveform(data) {
        const canvas = document.getElementById('waveformCanvas');
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = 0; x <= width; x += width / 10) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y <= height; y += height / 5) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // Draw waveform
        ctx.beginPath();
        ctx.strokeStyle = '#00E5FF';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        
        const step = width / (data.length - 1);
        
        data.forEach((value, index) => {
            const x = index * step;
            const y = height - (value / 100) * height;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Fill under waveform
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 229, 255, 0.1)';
        ctx.fill();
    }
    
    restartAnalysis() {
        this.resultsSection.style.display = 'none';
        this.frames = [];
        this.isAnalyzing = false;
    }
    
    showLoading(show) {
        this.loadingOverlay.style.display = show ? 'flex' : 'none';
    }
    
    showError(message) {
        alert(`Error: ${message}`);
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new CardioPredictApp();
});