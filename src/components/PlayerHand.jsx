import React, { useState } from 'react';
import Card from './Card';
import './PlayerHand.css'; // Đảm bảo import CSS

// 1. NHẬN THÊM PROP isDragMode
const PlayerHand = ({ hand, selectedCardIds, onCardClick, isInvalidPlay, thoiHeoCardIds, onReorder, onSwipeUp, gameState, isDragMode }) => {
    
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [startY, setStartY] = useState(null);

    // ==========================================
    // 1. KÉO THẢ TỰ XẾP BÀI (DRAG & DROP)
    // ==========================================
    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", index);
    };

    const handleDragOver = (e, targetIndex) => {
        e.preventDefault(); 
        if (draggedIndex === null || draggedIndex === targetIndex) return;
        const newHand = [...hand];
        const draggedCard = newHand[draggedIndex];
        newHand.splice(draggedIndex, 1);
        newHand.splice(targetIndex, 0, draggedCard);
        onReorder(newHand); 
        setDraggedIndex(targetIndex); 
    };

    const handleDragEnd = () => {
        setDraggedIndex(null); 
    };

    // ==========================================
    // 2. VUỐT LÊN ĐỂ ĐÁNH BÀI (SWIPE UP)
    // ==========================================
    const handlePointerDown = (e) => {
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        setStartY(clientY);
    };

    const handlePointerUp = (e) => {
        if (!startY || gameState !== 'playing') return;
        const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
        const distance = startY - clientY; 
        if (distance > 40 && selectedCardIds.length > 0) {
            onSwipeUp(); 
        }
        setStartY(null);
    };

    return (
        <div 
            className={`player-hand ${isInvalidPlay ? 'shake' : ''}`}
            onMouseDown={handlePointerDown}
            onMouseUp={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchEnd={handlePointerUp}
        >
            {hand.map((card, index) => {
                const isSelected = selectedCardIds.includes(card.id);
                const isThoiHeo = thoiHeoCardIds && thoiHeoCardIds.includes(card.id);
                const isDragging = draggedIndex === index;

                // MA THUẬT XẾP BÀI: Kiểm tra bề ngang màn hình
                const screenWidth = window.innerWidth;
                const cardSpacing = screenWidth < 950 ? 52 : 40; // 26 cho Mobile, 40 cho PC
                const offset = (index - (hand.length - 1) / 2) * cardSpacing + 32; 

                return (
                    <div 
                        key={card.id} 
                        className={`card-wrapper ${isThoiHeo ? 'thoi-heo-glow shake-thoi' : ''} ${isDragging ? 'dragging' : ''} ${isDragMode ? 'draggable-mode' : ''}`} 
                        
                        // SỬA Ở ĐÂY: Canh 50% rồi cộng trừ phần offset
                        style={{ zIndex: isDragging ? 100 : index, left: `calc(50% + ${offset}px)` }} 
                        
                        draggable={gameState === 'playing' && isDragMode}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                    >
                        <Card 
                            suit={card.suit} 
                            value={card.value} 
                            isSelected={isSelected} 
                            onClick={() => onCardClick(card.id)} 
                            disableClick={gameState === 'ended'} 
                        />
                    </div>
                );
            })}
        </div>
    );
};

export default PlayerHand;