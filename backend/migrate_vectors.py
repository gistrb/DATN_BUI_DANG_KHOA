import os
import sys
import django
import json
import logging

# Setup Django environment
sys.path.append(r'c:\Users\gistr\PycharmProjects\DOANTN\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from attendance.models import Employee, EmployeeFaceEmbedding

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_data():
    logger.info("Starting face embeddings migration to pgvector...")
    
    # Get all employees with old face_embeddings data
    employees = Employee.objects.exclude(face_embeddings__isnull=True).exclude(face_embeddings='')
    
    count = 0
    total = employees.count()
    
    logger.info(f"Found {total} employees with existing face embeddings to migrate.")
    
    for emp in employees:
        try:
            # Parse the old JSON string list of lists
            embeddings_list = json.loads(emp.face_embeddings)
            
            if not isinstance(embeddings_list, list):
                logger.warning(f"Employee {emp.employee_id} face_embeddings is not a list. Skipping.")
                continue
                
            # Clear existing vectors just in case it was run before
            emp.face_embeddings_vector.all().delete()
            
            vector_objects = []
            for emb in embeddings_list:
                vector_objects.append(EmployeeFaceEmbedding(employee=emp, embedding=emb))
                
            if vector_objects:
                EmployeeFaceEmbedding.objects.bulk_create(vector_objects)
                count += 1
                logger.info(f"Migrated {len(vector_objects)} embeddings for {emp.employee_id} - {emp.get_full_name()}")
                
        except Exception as e:
            logger.error(f"Error migrating employee {emp.employee_id}: {str(e)}")
            
    logger.info(f"Migration completed! Successfully migrated {count}/{total} employees.")

if __name__ == "__main__":
    migrate_data()
