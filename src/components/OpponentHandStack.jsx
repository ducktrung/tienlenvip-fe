import React from 'react';
import './OpponentHandStack.css';

const OpponentHandStack = ({ cardCount, position }) => {
    // 1. Tạo số lượng "lá bài giả" để tạo khối 3D (ví dụ render tối đa 10 lá giả để tạo khối)
    // Dựa trên số lượng bài hiện tại
    const maxFakeCardsForDepth = Math.min(cardCount, 10);
    const fakeCardsArray = Array.from({ length: maxFakeCardsForDepth });

    return (
        <div className={`opp-card-stack-container ${position}`}>
            <div className="opp-card-stack-inner">
                {/* 2. Render các lá bài giả phía dưới để tạo độ dày 3D */}
                {fakeCardsArray.map((_, index) => (
                    <div 
                        key={index} 
                        className="opp-fake-card"
                        // 3. Sử dụng CSS variable để tính toán offset tạo độ dày
                        style={{ '--card-depth': index }} 
                    >
                        <img src="/assets/cards/Cards (large)/card_back.png" alt="back" />
                    </div>
                ))}

                {/* 4. Huy hiệu đỏ chứa tổng số lá bài nằm trên cùng của lá bài đầu tiên */}
                {cardCount > 0 && (
                    <div className="opp-card-count-badge">
                        {cardCount}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OpponentHandStack;