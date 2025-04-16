const fs = require('fs');
const path = require('path');

// Path to the TranscriptHistory.js file
const filePath = path.join(__dirname, 'client', 'src', 'components', 'TranscriptHistory.js');

// Read the file
fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error(`Error reading file: ${err}`);
    return;
  }

  // Remove the import line for js-cookie
  let updatedContent = data.replace(/import Cookies from 'js-cookie';(\r?\n)/g, '');
  
  // Replace Cookies.get('token') with localStorage.getItem('auth_token')
  updatedContent = updatedContent.replace(/const token = Cookies\.get\('token'\);/g, 
                                        "const token = localStorage.getItem('auth_token');");

  // Write the updated content back to the file
  fs.writeFile(filePath, updatedContent, 'utf8', (err) => {
    if (err) {
      console.error(`Error writing file: ${err}`);
      return;
    }
    console.log(`Successfully updated ${filePath}`);
  });
}); 