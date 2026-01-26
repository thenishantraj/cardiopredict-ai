from flask import Flask, render_template, request, jsonify
import cv2
import numpy as np
import base64
import io
from PIL import Image
import json
from cardiopredict_model import CardioPredictModel
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)
model = CardioPredictModel()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze_video():
    try:
        data = request.json
        video_data = data['video_data']  # Base64  encoded video frames
        
        # Process video and get analysis
        result = model.process_video_frames(video_data)
        
        return jsonify({
            'success': True,
            'heart_rate': result['heart_rate'],
            'hrv': result['hrv'],
            'risk_score': result['risk_score'],
            'risk_level': result['risk_level'],
            'recommendations': result['recommendations'],
            'waveform_data': result['waveform_data']
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/quick_demo')
def quick_demo():
    """Generate demo data for testing without camera"""
    demo_result = model.generate_demo_data()
    return jsonify(demo_result)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
