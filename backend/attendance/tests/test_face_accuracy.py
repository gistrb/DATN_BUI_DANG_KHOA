"""Face Recognition Accuracy Tests (Updated)"""
import pytest
import numpy as np
import time
from attendance.views.face_views import compute_similarity, find_matching_employee
from attendance.models import Employee
from unittest.mock import Mock, patch

@pytest.mark.django_db
class TestFaceRecognitionLogic:
    
    def test_compute_similarity_same_embedding(self):
        """Test cosine similarity for identical embeddings"""
        embedding = np.random.rand(512)
        # Normalize to ensure logic holds if input isn't normalized (though usually is)
        embedding = embedding / np.linalg.norm(embedding)
        similarity = compute_similarity(embedding, embedding)
        # Numerical precision might make it 0.999999
        assert similarity >= 0.99
    
    def test_compute_similarity_orthogonal(self):
        """Test cosine similarity for orthogonal vectors"""
        emb1 = np.array([1.0, 0.0])
        emb2 = np.array([0.0, 1.0])
        similarity = compute_similarity(emb1, emb2)
        assert abs(similarity) < 1e-6
        
    def test_compute_similarity_high_match(self):
        """Test similarity for very close vectors"""
        base = np.random.rand(512)
        noise = np.random.rand(512) * 0.05
        similar = base + noise
        similarity = compute_similarity(base, similar)
        assert similarity > 0.9
        
    def test_find_matching_employee_no_match(self):
        """Test finding match when no employees exist"""
        # Given no employees in DB
        match, score = find_matching_employee(np.random.rand(512))
        assert match is None
        assert score == 0

    def test_find_matching_employee_with_match(self):
        """Test finding match with existing employee"""
        # Create an employee with a known embedding
        target_emb = np.random.rand(512)
        target_emb = target_emb / np.linalg.norm(target_emb)
        
        emp = Employee.objects.create(employee_id='TEST_MATCH', first_name='Test', last_name='Match')
        emp.set_face_embeddings([target_emb])
        emp.save()
        
        # Test exact match
        match, score = find_matching_employee(target_emb)
        assert match is not None
        assert match.employee_id == 'TEST_MATCH'
        assert score > 0.99 
        
    def test_find_matching_employee_below_threshold(self):
        """Test input that is too different from stored embedding"""
        target_emb = np.random.rand(512)
        
        emp = Employee.objects.create(employee_id='TEST_NO_MATCH', first_name='Test', last_name='NoMatch')
        emp.set_face_embeddings([target_emb])
        emp.save()
        
        # Generate orthogonal/random embedding
        diff_emb = np.random.rand(512)
        # Ensure it's different enough (random high dime vectors usually are orthogonal)
        
        match, score = find_matching_employee(diff_emb)
        
        # Unless we are extremely unlucky, score should be low
        assert match is None
        assert score < 0.75 # Default threshold

    def test_performance_compute_similarity(self):
        """Test performance of similarity computation"""
        emb = np.random.rand(512)
        start = time.time()
        for _ in range(1000):
            compute_similarity(emb, emb)
        duration = time.time() - start
        # Should be very fast (milliseconds)
        assert duration < 1.0
