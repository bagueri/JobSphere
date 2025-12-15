// إنشاء أيقونات PWA
function createIcon(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // خلفية متدرجة
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#2196F3');
    gradient.addColorStop(1, '#1976D2');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // شكل الدائرة الخارجية
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2 - size*0.05, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = size * 0.02;
    ctx.stroke();
    
    // أيقونة الحقيبة
    const bagSize = size * 0.4;
    const bagX = size/2 - bagSize/2;
    const bagY = size/2 - bagSize/2;
    
    ctx.fillStyle = 'white';
    ctx.fillRect(bagX, bagY + bagSize*0.2, bagSize, bagSize*0.6);
    
    // مقبض الحقيبة
    ctx.beginPath();
    ctx.arc(size/2, bagY + bagSize*0.2, bagSize*0.15, Math.PI, 0);
    ctx.lineTo(size/2 + bagSize*0.15, bagY + bagSize*0.2);
    ctx.fill();
    
    // خطوط داخلية للحقيبة
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = size * 0.01;
    ctx.beginPath();
    ctx.moveTo(bagX + bagSize*0.2, bagY + bagSize*0.4);
    ctx.lineTo(bagX + bagSize*0.8, bagY + bagSize*0.4);
    ctx.moveTo(bagX + bagSize*0.2, bagY + bagSize*0.6);
    ctx.lineTo(bagX + bagSize*0.8, bagY + bagSize*0.6);
    ctx.stroke();
    
    return canvas;
}

// إنشاء الأيقونات بأحجام مختلفة
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// في بيئة حقيقية، ستستخدم هذا الكود لإنشاء وحفظ الأيقونات
// sizes.forEach(size => {
//     const canvas = createIcon(size);
//     canvas.toBlob(blob => {
//         const url = URL.createObjectURL(blob);
//         const a = document.createElement('a');
//         a.href = url;
//         a.download = `icon-${size}.png`;
//         a.click();
//         URL.revokeObjectURL(url);
//     });
// });

console.log('تم تحضير إنشاء الأيقونات');
