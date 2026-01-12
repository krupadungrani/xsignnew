import { motion } from "framer-motion";

export function FloatingElements() {
  const elements = [
    { id: 1, x: 20, y: 20, size: 4, delay: 0 },
    { id: 2, x: 80, y: 40, size: 6, delay: 0.5 },
    { id: 3, x: 40, y: 80, size: 3, delay: 1 },
    { id: 4, x: 90, y: 70, size: 5, delay: 1.5 },
    { id: 5, x: 10, y: 60, size: 4, delay: 2 },
    { id: 6, x: 70, y: 20, size: 3, delay: 2.5 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {elements.map((element) => (
        <motion.div
          key={element.id}
          className="absolute w-2 h-2 bg-white/20 rounded-full"
          style={{
            left: `${element.x}%`,
            top: `${element.y}%`,
            width: `${element.size}px`,
            height: `${element.size}px`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: [0, 1, 0], 
            scale: [0, 1, 0],
            y: [0, -20, 0]
          }}
          transition={{
            duration: 4,
            delay: element.delay,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}
      
      {/* Larger floating shapes */}
      <motion.div
        className="absolute w-32 h-32 border border-white/10 rounded-full"
        style={{ left: "10%", top: "30%" }}
        animate={{
          rotate: 360,
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      
      <motion.div
        className="absolute w-24 h-24 border border-white/10 rounded-full"
        style={{ right: "15%", top: "20%" }}
        animate={{
          rotate: -360,
          scale: [1, 0.9, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      
      <motion.div
        className="absolute w-16 h-16 border border-white/10 rounded-full"
        style={{ right: "25%", bottom: "25%" }}
        animate={{
          rotate: 360,
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "linear"
        }}
      />
    </div>
  );
}
