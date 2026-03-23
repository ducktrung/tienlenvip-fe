import React from 'react';
import './Card.css';

const Card = ({ suit, value, isSelected, onClick, isInvalid }) => {
    // Ép kiểu value về chuỗi (đề phòng truyền vào là số nguyên)
    const stringValue = String(value);

    // XỬ LÝ LỖI TÊN FILE: Thêm số '0' vào trước các số từ 2 đến 9
    const isSingleDigit = ['2', '3', '4', '5', '6', '7', '8', '9'].includes(stringValue);
    const formattedValue = isSingleDigit ? `0${stringValue}` : stringValue;

    // Lúc này: '3' sẽ thành '03', nhưng '10' hoặc 'K' vẫn giữ nguyên
    const fileName = `card_${suit}_${formattedValue}.png`;
    const imagePath = `/assets/cards/Cards (large)/${fileName}`;

    return (
        <div 
            // Thêm logic: Nếu isInvalid = true thì chèn thêm class 'shake-error'
            className={`playing-card ${isSelected ? 'selected' : ''} ${isInvalid ? 'shake-error' : ''}`} 
            onPointerDown={onClick}
        >
            <img src={imagePath} alt={`${value} of ${suit}`} />
        </div>
    );
};

export default Card;