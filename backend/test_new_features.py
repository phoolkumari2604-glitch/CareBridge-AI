import os
import io
import uuid
from PIL import Image
from app import create_app

def test_new_features():
    app = create_app()
    client = app.test_client()
    test_id = uuid.uuid4().hex[:8]

    # Register & Login
    reg_email = f"flask_feature_patient_{test_id}@carebridge.test"
    reg_payload = {
        "name": f"Feature Patient {test_id.upper()}",
        "email": reg_email,
        "password": "SecurePassword123!",
        "phone": "+91 9876543210",
        "age": 30,
        "gender": "Female",
        "blood_group": "A+",
        "heart_rate": 72,
        "systolic_bp": 120,
        "diastolic_bp": 80,
        "spo2": 98.5,
        "temperature": 37.0,
        "weight": 60.0,
        "height": 165.0,
        "allergies": "None",
        "medical_history": "None"
    }
    reg_res = client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code == 201, f"Registration failed: {reg_res.data}"
    reg_data = reg_res.get_json()
    patient_id = reg_data.get("patient_id")
    assert patient_id is not None

    login_res = client.post("/api/auth/login", json={
        "email": reg_email,
        "password": "SecurePassword123!"
    })
    assert login_res.status_code == 200
    token = login_res.get_json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"Logged in test patient: {reg_email}, patient_id: {patient_id}")

    print("\n--- 1. Testing AI Assistant Chat with Image & Friendly Fallback ---")
    img = Image.new("RGB", (100, 100), color="blue")
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_byte_arr.seek(0)

    data = {
        'patient_id': patient_id,
        'message': 'Please analyze this test medical photo.',
        'images': (img_byte_arr, 'test_scan.jpg')
    }
    res = client.post('/api/ai-assistant/chat', data=data, content_type='multipart/form-data', headers=headers)
    assert res.status_code == 200, f"AI chat failed: {res.data}"
    res_json = res.get_json()
    assert 'response' in res_json
    print("[PASS] AI Multimodal image chat response received:", res_json['response'][:60] + "...")

    print("\n--- 2. Testing Notifications Simulation & Batch Management ---")
    sim_res = client.post('/api/notifications/simulate-alert', json={
        'patient_id': patient_id,
        'severity': 'critical',
        'title': 'Test Arrhythmia Alert',
        'message': 'Heart rate spiked to 140 BPM while at rest.'
    }, headers=headers)
    assert sim_res.status_code == 201
    print("[PASS] Simulated alert created successfully")

    # Mark all read
    mark_res = client.put(f'/api/notifications/{patient_id}/mark-all-read', headers=headers)
    assert mark_res.status_code == 200
    print("[PASS] Mark all notifications read:", mark_res.get_json())

    # Clear all
    clear_res = client.delete(f'/api/notifications/{patient_id}/clear-all', headers=headers)
    assert clear_res.status_code == 200
    print("[PASS] Clear all notifications:", clear_res.get_json())

    print("\n--- 3. Testing Medical Records Multi-File Upload & Batch Delete ---")
    img1 = io.BytesIO()
    Image.new("RGB", (50, 50), color="red").save(img1, format='PNG')
    img1.seek(0)
    
    img2 = io.BytesIO()
    Image.new("RGB", (50, 50), color="green").save(img2, format='JPEG')
    from werkzeug.datastructures import MultiDict
    rec_data = MultiDict([
        ('patient_id', patient_id),
        ('title', 'Comprehensive Blood Panel'),
        ('record_type', 'Lab Report'),
        ('diagnosis', 'Normal lipid profile and HbA1c'),
        ('doctor_name', 'Dr. Sharma'),
        ('files', (img1, 'report1.png')),
        ('files', (img2, 'report2.jpg'))
    ])
    rec_res = client.post('/api/health-records', data=rec_data, content_type='multipart/form-data', headers=headers)
    assert rec_res.status_code == 201, f"Create record failed: {rec_res.data}"
    rec_json = rec_res.get_json()
    record_id = rec_json['record']['_id']
    files = rec_json['record'].get('attachments', [])
    assert len(files) == 2, f"Expected 2 files attached, got {len(files)}"
    print(f"[PASS] Multi-file health record created with ID {record_id} and {len(files)} files")

    # Verify physical file existence in backend/uploads
    for f in files:
        filename = f['file_url'].split('/')[-1]
        filepath = os.path.join(os.path.dirname(__file__), 'uploads', filename)
        assert os.path.exists(filepath), f"File {filepath} should exist on disk"
    print("[PASS] Files exist in uploads directory")

    # Batch delete
    del_res = client.post('/api/health-records/batch-delete', json={
        'patient_id': patient_id,
        'record_ids': [record_id]
    }, headers=headers)
    assert del_res.status_code == 200
    print("[PASS] Batch delete successful:", del_res.get_json())

    # Verify physical files purged from disk
    for f in files:
        filename = f['file_url'].split('/')[-1]
        filepath = os.path.join(os.path.dirname(__file__), 'uploads', filename)
        assert not os.path.exists(filepath), f"File {filepath} should have been purged from disk"
    print("[PASS] Files successfully purged from disk upon deletion")

    print("\n========================================================")
    print(">>> ALL UPGRADE CAPABILITY TESTS PASSED WITH 100% <<<")
    print("========================================================\n")

if __name__ == '__main__':
    test_new_features()
