from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
import os
import base64
from datetime import datetime
import uuid
from scanner import FingerprintScanner

app = Flask(__name__)
CORS(app)

# Initialize scanner
scanner = FingerprintScanner()

# Configuration - Updated to match your exact folder structure
BASE_DIR = os.path.expanduser('~')
DATA_DIR = os.path.join(
    BASE_DIR, 'Desktop', 'BG Detection', 'New Data'
)
BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
FINGER_MAPPING = {
    'Right Hand': {
        'Thumb': 'RT',
        'Index Finger': 'RF',
        'Middle Finger': 'RM',
        'Ring Finger': 'RR',
        'Little Finger': 'RL'
    },
    'Left Hand': {
        'Thumb': 'LT',
        'Index Finger': 'LF',
        'Middle Finger': 'LM',
        'Ring Finger': 'LR',
        'Little Finger': 'LL'
    }
}

def ensure_directory_structure():
    """Ensure the required directory structure exists"""
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
    
    for bg in BLOOD_GROUPS:
        bg_dir = os.path.join(DATA_DIR, bg)
        if not os.path.exists(bg_dir):
            os.makedirs(bg_dir)
        
        for finger_code in set().union(*[set(v.values()) for v in FINGER_MAPPING.values()]):
            finger_dir = os.path.join(bg_dir, finger_code)
            if not os.path.exists(finger_dir):
                os.makedirs(finger_dir)

@app.route('/help')
def help_page():
    return send_from_directory('3_HelpUsPage', 'helpImprove.html')
# Serve static files for help page
@app.route('/help/<path:filename>')
def help_static(filename):
    return send_from_directory('3_HelpUsPage', filename)

@app.route('/check-scanner', methods=['GET'])
def check_scanner():
    return jsonify({
        'connected': scanner.scanner_connected,
        'message': 'Scanner ready' if scanner.scanner_connected else 'Scanner not connected'
    })

@app.route('/scan-fingerprint', methods=['POST'])
def scan_fingerprint():
    try:
        if not scanner.scanner_connected:
            return jsonify({'success': False, 'message': 'Scanner not connected'}), 400
        
        image = scanner.scan_fingerprint()
        temp_path = scanner.save_temp_image(image)
        
        return jsonify({
            'success': True,
            'image_path': temp_path,
            'message': 'Fingerprint scanned successfully'
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/get-scan/<path:filename>', methods=['GET'])
def get_scan(filename):
    try:
        return send_file(filename, mimetype='image/png')
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 404

@app.route('/save-fingerprints', methods=['POST'])
def save_fingerprints():
    try:
        data = request.json
        blood_group = data.get('bloodGroup')
        fingerprints = data.get('fingerprints', {})
        
        if blood_group not in BLOOD_GROUPS:
            return jsonify({'success': False, 'message': 'Invalid blood group'}), 400
        
        has_images = any(
            image_data is not None
            for hand in fingerprints.values()
            for image_data in hand.values()
        )
        if not has_images:
            return jsonify({'success': False, 'message': 'No fingerprint images provided'}), 400
        
        for hand_type, fingers in fingerprints.items():
            for finger_name, image_data in fingers.items():
                if image_data is None:
                    continue
                
                finger_code = FINGER_MAPPING[hand_type][finger_name]
                save_fingerprint(blood_group, finger_code, image_data)
        
        return jsonify({'success': True})
    
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

def save_fingerprint(blood_group, finger_code, image_data):
    """Save a fingerprint image to the appropriate directory"""
    header, encoded = image_data.split(',', 1)
    image_format = header.split('/')[1].split(';')[0]
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    unique_id = str(uuid.uuid4())[:8]
    filename = f"{timestamp}_{unique_id}.{image_format}"
    
    target_dir = os.path.join(DATA_DIR, blood_group, finger_code)
    binary_data = base64.b64decode(encoded)
    
    with open(os.path.join(target_dir, filename), 'wb') as f:
        f.write(binary_data)

if __name__ == '__main__':
    ensure_directory_structure()
    app.run(host='0.0.0.0', port=3000, debug=True)