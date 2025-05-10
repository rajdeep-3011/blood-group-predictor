from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import tensorflow as tf
from PIL import Image
import numpy as np
import io
import sys
import time
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Constants
BLOOD_TYPES = ['A+', 'A-', 'AB+', 'AB-', 'B+', 'B-', 'O+', 'O-']
MODEL_PATH = '0_Models/Model_RT.keras'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'bmp'}

# Load model once when starting the app
print("Initializing model...")
print("Is GPU Available: ", tf.config.list_physical_devices('GPU'))
model = tf.keras.models.load_model(MODEL_PATH)
print("Model loaded successfully")

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def preprocess_image(image):
    """Preprocess image for model prediction"""
    if image.mode != 'RGB':
        image = image.convert('RGB')
    img = image.resize((224, 224))
    img_array = np.array(img) / 255.0
    return np.expand_dims(img_array, axis=0)

@app.route('/predict', methods=['POST'])
def predict():
    """Handle prediction requests"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type'}), 400
    
    try:
        # Read and process image
        img = Image.open(io.BytesIO(file.read()))
        processed_img = preprocess_image(img)
        
        # Make prediction
        predictions = model.predict(processed_img)
        predicted_class = np.argmax(predictions[0])
        confidence = round(float(np.max(predictions[0])) * 100, 2)
        
        # Get additional hand/finger data if available
        hand = request.form.get('hand', 'unknown')
        finger = request.form.get('finger', 'unknown')
        
        return jsonify({
            'blood_type': BLOOD_TYPES[predicted_class],
            'confidence': confidence,
            'hand': hand,
            'finger': finger
        })
        
    except Exception as e:
        app.logger.error(f"Prediction error: {str(e)}")
        return jsonify({'error': 'Failed to process image'}), 500

@app.route('/')
def serve_index():
    # Serve index.html from the 2_mainPage directory
    return send_from_directory(os.path.abspath('2_mainPage'), 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    # Serve files from either static directory or main page directory
    if os.path.exists(os.path.join('static', path)):
        return send_from_directory('static', path)
    elif os.path.exists(os.path.join('2_mainPage', path)):
        return send_from_directory(os.path.abspath('2_mainPage'), path)
    else:
        return "File not found", 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)