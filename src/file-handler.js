const fs = require("fs");
const constants = require("./constants");
const { FILES_DIR } = constants;
const PATH = "data/practices.json";

const read = (path = PATH) => {
    // Get content from file
    const contents = fs.readFileSync(path);
    // Define to JSON type
    const jsonContent = JSON.parse(contents);
    return jsonContent;
};

const write = (newContent, path = PATH) => {
    const stringContent = JSON.stringify(newContent);
    fs.writeFile(path, stringContent, err => {
        if (err) {
            return console.log(err);
        }

        console.log("The file was saved!");
    });
};

const createFile = (path, initialData) => {
    const stringContent = JSON.stringify(initialData);
    fs.writeFile(path, stringContent, err => {
        if (err) {
            return console.log(err);
        }

        console.log("The file was saved!");
    });
};

const buildPracticePath = practiceId => {
    return `${FILES_DIR}/practice-${practiceId}`;
};

const getPracticeDetails = practiceId => {
    const practicePath = buildPracticePath(practiceId);
    return read(practicePath);
};

const updatePractice = (practiceId, newContent) => {
    const practicePath = buildPracticePath(practiceId);
    write(newContent, practicePath);
};

const fileHandler = {
    buildPracticePath,
    createFile,
    getPracticeDetails,
    read,
    updatePractice,
    write,
};

module.exports = fileHandler;
