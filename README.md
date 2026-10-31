# CampusCare - Online Campus Complaint Management System

CampusCare is a full-stack campus complaint management platform that allows students to register and track campus-related grievances, while providing administrators with a dashboard to manage, update, and resolve complaints.

## 🚀 Features

- **Student Portal:**
  - Submit complaints across multiple campus categories (Hostel, Academic, Infrastructure, etc.).
  - Track complaint status using a unique tracking ID.
  - View real-time updates and status changes.

- **Admin Dashboard:**
  - View, filter, and search student grievances.
  - Update complaint statuses (Pending, In Progress, Resolved).
  - Add administrative notes and track resolution timelines.

- **RESTful Backend:**
  - Built with Spring Boot and Spring Data JPA.
  - MySQL database persistence.
  - Clean API design with validation.

---

## 📁 Project Structure

```text
Campuscare project/
├── campuscare/              # Spring Boot Backend
│   ├── src/                 # Java source code & resources
│   ├── pom.xml              # Maven dependencies & build configuration
│   ├── mvnw / mvnw.cmd      # Maven wrappers
│   └── HELP.md
├── frontend/                # Frontend Web Application
│   ├── admin.html           # Admin portal
│   ├── index.html           # Landing page
│   ├── student.html         # Student portal
│   ├── css/                 # Styling sheets
│   └── js/                  # JavaScript frontend logic & API client
└── README.md
```

---

## 🛠️ Tech Stack

- **Backend:** Java 17+, Spring Boot, Spring Data JPA, Hibernate, Maven
- **Database:** MySQL
- **Frontend:** HTML5, CSS3, JavaScript (Fetch API)

---

## ⚙️ Getting Started

### 1. Database Setup
1. Create a MySQL database named `campuscare_db`:
   ```sql
   CREATE DATABASE campuscare_db;
   ```
2. Configure credentials in `campuscare/src/main/resources/application.properties` if needed:
   ```properties
   spring.datasource.url=jdbc:mysql://localhost:3306/campuscare_db
   spring.datasource.username=root
   spring.datasource.password=YOUR_PASSWORD
   ```

### 2. Run the Backend
Navigate to the backend directory and run:
```bash
cd campuscare
./mvnw spring-boot:run
```
Or on Windows:
```cmd
cd campuscare
mvnw.cmd spring-boot:run
```
The backend will start on `http://localhost:8080`.

### 3. Run the Frontend
Open `frontend/index.html` in your web browser, or serve it using a local HTTP server (such as Live Server in VS Code).

---

## 👤 Author
- **Soumya Swastik Sahoo** (GitHub: [@soumyaswastik0048](https://github.com/soumyaswastik0048))
