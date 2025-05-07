// fix-buffer-equal.js
// Patch for buffer-equal-constant-time compatibility with Node.js 24
const fs = require('fs');
const path = require('path');

try {
  const modulePath = path.resolve(__dirname, 'node_modules/buffer-equal-constant-time/index.js');
  
  // Check if the file exists
  if (fs.existsSync(modulePath)) {
    console.log('Patching buffer-equal-constant-time for Node.js 24 compatibility...');
    
    // Read the file content
    let content = fs.readFileSync(modulePath, 'utf8');
    
    // Apply the patch if the file contains the problematic code
    if (content.includes('var origSlowBufEqual = SlowBuffer.prototype.equal')) {
      // Replace problematic code with a safer version
      content = content.replace(
        'var origSlowBufEqual = SlowBuffer.prototype.equal;',
        `var origSlowBufEqual = (typeof SlowBuffer !== 'undefined' && SlowBuffer.prototype && SlowBuffer.prototype.equal) || 
        function(actual) {
          if (actual === this) return true;
          if (this.length !== actual.length) return false;
          for (var i = 0; i < this.length; i++) {
            if (this[i] !== actual[i]) return false;
          }
          return true;
        };`
      );
      
      // Save the patched file
      fs.writeFileSync(modulePath, content, 'utf8');
      console.log('Successfully patched buffer-equal-constant-time module');
    } else {
      console.log('Module either already patched or has a different structure');
    }
  } else {
    console.log('Module buffer-equal-constant-time not found, skipping patch');
  }
} catch (error) {
  console.error('Error patching buffer-equal-constant-time:', error);
} 