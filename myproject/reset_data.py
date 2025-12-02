"""
Script to reset and populate sample data with proper Department linking
Run this with: python manage.py shell < reset_data.py
"""

from django.contrib.auth.models import User
from attendance.models import Employee, Department, AttendanceRecord
from datetime import date

print("=" * 50)
print("RESETTING DATA - Xóa dữ liệu cũ và tạo dữ liệu mẫu mới")
print("=" * 50)

# Step 1: Delete old data
print("\n1. Xóa dữ liệu cũ...")
AttendanceRecord.objects.all().delete()
print(f"   - Đã xóa {AttendanceRecord.objects.count()} attendance records")

Employee.objects.all().delete()
print(f"   - Đã xóa tất cả employees")

Department.objects.all().delete()
print(f"   - Đã xóa tất cả departments")

# Keep admin user, delete others
User.objects.exclude(username='admin').delete()
print(f"   - Đã xóa users (giữ lại admin)")

# Step 2: Create Departments
print("\n2. Tạo phòng ban...")
departments_data = [
    {"name": "Phòng Kỹ Thuật", "description": "Phòng phát triển phần mềm và công nghệ"},
    {"name": "Phòng Kinh Doanh", "description": "Phòng bán hàng và chăm sóc khách hàng"},
    {"name": "Phòng Nhân Sự", "description": "Phòng quản lý nhân sự và tuyển dụng"},
    {"name": "Phòng Kế Toán", "description": "Phòng tài chính và kế toán"},
    {"name": "Phòng Marketing", "description": "Phòng marketing và truyền thông"},
]

departments = {}
for dept_data in departments_data:
    dept = Department.objects.create(**dept_data)
    departments[dept.name] = dept
    print(f"   ✓ Tạo phòng ban: {dept.name}")

# Step 3: Create sample employees
print("\n3. Tạo nhân viên mẫu...")
employees_data = [
    # Phòng Kỹ Thuật
    {"username": "nguyenvana", "first_name": "Văn A", "last_name": "Nguyễn", "email": "vana@company.com",
     "employee_id": "NV001", "department": "Phòng Kỹ Thuật", "position": "Trưởng phòng", "work_status": "WORKING"},
    {"username": "tranthib", "first_name": "Thị B", "last_name": "Trần", "email": "thib@company.com",
     "employee_id": "NV002", "department": "Phòng Kỹ Thuật", "position": "Senior Developer", "work_status": "WORKING"},
    {"username": "levanc", "first_name": "Văn C", "last_name": "Lê", "email": "vanc@company.com",
     "employee_id": "NV003", "department": "Phòng Kỹ Thuật", "position": "Developer", "work_status": "WORKING"},
    
    # Phòng Kinh Doanh
    {"username": "phamthid", "first_name": "Thị D", "last_name": "Phạm", "email": "thid@company.com",
     "employee_id": "NV004", "department": "Phòng Kinh Doanh", "position": "Trưởng phòng", "work_status": "WORKING"},
    {"username": "hoangvane", "first_name": "Văn E", "last_name": "Hoàng", "email": "vane@company.com",
     "employee_id": "NV005", "department": "Phòng Kinh Doanh", "position": "Sales Manager", "work_status": "WORKING"},
    {"username": "vuthif", "first_name": "Thị F", "last_name": "Vũ", "email": "thif@company.com",
     "employee_id": "NV006", "department": "Phòng Kinh Doanh", "position": "Sales", "work_status": "ON_LEAVE"},
    
    # Phòng Nhân Sự
    {"username": "dovang", "first_name": "Văn G", "last_name": "Đỗ", "email": "vang@company.com",
     "employee_id": "NV007", "department": "Phòng Nhân Sự", "position": "Trưởng phòng", "work_status": "WORKING"},
    {"username": "ngothih", "first_name": "Thị H", "last_name": "Ngô", "email": "thih@company.com",
     "employee_id": "NV008", "department": "Phòng Nhân Sự", "position": "HR Specialist", "work_status": "WORKING"},
    
    # Phòng Kế Toán
    {"username": "buivani", "first_name": "Văn I", "last_name": "Bùi", "email": "vani@company.com",
     "employee_id": "NV009", "department": "Phòng Kế Toán", "position": "Trưởng phòng", "work_status": "WORKING"},
    {"username": "duongthik", "first_name": "Thị K", "last_name": "Dương", "email": "thik@company.com",
     "employee_id": "NV010", "department": "Phòng Kế Toán", "position": "Kế toán viên", "work_status": "WORKING"},
    
    # Phòng Marketing
    {"username": "lyvanl", "first_name": "Văn L", "last_name": "Lý", "email": "vanl@company.com",
     "employee_id": "NV011", "department": "Phòng Marketing", "position": "Trưởng phòng", "work_status": "WORKING"},
    {"username": "dinhthim", "first_name": "Thị M", "last_name": "Đinh", "email": "thim@company.com",
     "employee_id": "NV012", "department": "Phòng Marketing", "position": "Content Creator", "work_status": "WORKING"},
]

for emp_data in employees_data:
    # Create user
    user = User.objects.create_user(
        username=emp_data["username"],
        first_name=emp_data["first_name"],
        last_name=emp_data["last_name"],
        email=emp_data["email"],
        password="123456"  # Default password
    )
    
    # Create employee
    employee = Employee.objects.create(
        user=user,
        employee_id=emp_data["employee_id"],
        department=emp_data["department"],
        position=emp_data["position"],
        work_status=emp_data["work_status"],
        join_date=date(2024, 1, 1),
        current_status='NOT_IN'
    )
    
    print(f"   ✓ Tạo nhân viên: {employee.user.get_full_name()} ({employee.employee_id}) - {employee.department}")

# Summary
print("\n" + "=" * 50)
print("HOÀN TẤT!")
print("=" * 50)
print(f"Tổng số phòng ban: {Department.objects.count()}")
print(f"Tổng số nhân viên: {Employee.objects.count()}")
print("\nPhân bố nhân viên theo phòng ban:")
for dept in Department.objects.all():
    count = Employee.objects.filter(department=dept.name).count()
    print(f"  - {dept.name}: {count} nhân viên")

print("\n✓ Dữ liệu đã được reset và tạo mới thành công!")
print("✓ Mật khẩu mặc định cho tất cả nhân viên: 123456")
