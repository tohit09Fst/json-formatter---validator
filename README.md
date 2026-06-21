# 🚀 JSON Formatter & Validator

A modern, fast, and developer-friendly JSON Formatter, Validator, Viewer, Diff Tool, and Converter built with **React, TypeScript, Vite, and Tailwind CSS**.

Perfect for developers, testers, backend engineers, API consumers, and students who work with JSON data daily.

---

## ✨ Features

### 📝 JSON Validation
- Real-time JSON validation
- Detailed error messages
- Error line and column detection
- Invalid JSON highlighting
- Helpful error snippets

### 🎨 JSON Formatting
- Beautify JSON instantly
- Minify JSON
- 2-space indentation
- 4-space indentation
- Tab indentation support
- Alphabetical key sorting

### 🔍 JSON Explorer
- Interactive JSON tree view
- Expand/Collapse nodes
- Search within JSON
- Navigate nested structures
- View large JSON files easily

### 📊 JSON Statistics
- File size calculation
- Total lines count
- Character count
- JSON keys count

### 🔎 Query JSON Data
Supports JSON path filtering:

```bash
$
$.users
$.users[0]
users[0].name
items[*].id
```

### ⚖️ JSON Diff Tool
Compare two JSON documents side-by-side.

Features:
- Detect added values
- Detect removed values
- Detect modified values
- Visual comparison view

### 📂 Import & Export
Supported export formats:

- JSON
- YAML
- XML
- CSV

### 📜 History Management
- Local storage history
- Restore previous JSON
- Persistent session storage

### 🌙 Dark Mode
- Automatic dark mode support
- Clean modern UI
- Responsive design

---

## 🛠️ Tech Stack

### Frontend
- React 19
- TypeScript
- Vite
- Tailwind CSS
- Lucide React Icons

### Additional Libraries
- Motion
- Express
- Dotenv

---

## 📁 Project Structure

```bash
src/
│
├── components/
│   ├── JsonTree.tsx
│   ├── JsonDiff.tsx
│   └── SidebarHistory.tsx
│
├── utils/
│   └── jsonUtils.ts
│
├── App.tsx
├── main.tsx
├── index.css
└── types.ts
```

---

## ⚙️ Installation

### Clone Repository

```bash
git clone https://github.com/your-username/json-formatter-validator.git
```

### Navigate to Project

```bash
cd json-formatter-validator
```

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
npm run dev
```

Application will run on:

```bash
http://localhost:3000
```

---

## 🏗️ Build for Production

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

---

## 📌 Example JSON

```json
{
  "name": "Tohit Khan",
  "role": "Frontend Developer",
  "skills": [
    "React",
    "TypeScript",
    "Node.js"
  ]
}
```

---

## 🎯 Use Cases

- API Response Formatting
- Debugging JSON Data
- Learning JSON Structure
- Backend Development
- Frontend Development
- Data Validation
- Configuration File Analysis
- JSON Comparison

---

## 🚀 Performance

✔ Instant Formatting

✔ Fast Parsing Engine

✔ Large JSON Support

✔ Lightweight Architecture

✔ Responsive UI

---

## 🔐 Privacy

All JSON processing happens locally in your browser.

- No data upload
- No server-side processing
- No tracking
- Safe for sensitive JSON files

---

## 📸 Main Functionalities

- JSON Formatter
- JSON Validator
- JSON Tree Viewer
- JSON Search
- JSON Diff Tool
- JSON to XML Converter
- JSON to YAML Converter
- JSON to CSV Converter
- Export & Download
- History Tracking

---

## 🤝 Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feature/new-feature
```

3. Commit changes

```bash
git commit -m "Add new feature"
```

4. Push branch

```bash
git push origin feature/new-feature
```

5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

**Tohit Khan**

Frontend Developer | MERN Stack Developer | AI/ML Enthusiast

- React.js
- TypeScript
- Node.js
- MongoDB
- Express.js
- AI/ML

---

⭐ If you like this project, don't forget to star the repository.