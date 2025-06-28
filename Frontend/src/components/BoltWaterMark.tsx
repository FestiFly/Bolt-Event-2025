import React from "react";
import boltLogo from "../assets/bolt-logo.png"; 

const BoltWaterMark = () => {
  return (
    <div style={{
      position: "fixed",
      top: "20px",
      right: "28px",
      zIndex: 9999,
      opacity: 0.8,
    }}>
    <a
      href="https://bolt.new/"
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: "inline-block" }}
    >
      <img 
        src={boltLogo} 
        alt="Powered by Bolt" 
        style={{ 
          width: "88px", 
          height: "88px", 
          borderRadius: "50%", 
          boxShadow: "0 0 10px rgba(255,255,255,0.2)",
          cursor: "pointer"
        }} 
      />
    </a>
    </div>
  );
};

export default BoltWaterMark;
