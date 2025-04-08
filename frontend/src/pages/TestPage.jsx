import React from 'react';

const TestPage = () => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Test Page</h1>
      <p className="mb-4">This is a test page to verify the footer visibility.</p>
      <div className="h-96 bg-gray-100 flex items-center justify-center rounded-lg mb-6">
        <p>Spacer content to push page height</p>
      </div>
      <p>The footer should be visible below this text.</p>
    </div>
  );
};

export default TestPage; 