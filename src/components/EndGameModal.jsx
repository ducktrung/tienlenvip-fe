import React from 'react';
import './EndGameModal.css';

const EndGameModal = ({ results, onRestart }) => {
    return (
        <div className="end-game-overlay">
            <div className="end-game-content">
                <h1 className="end-title">TỔNG KẾT VÁN ĐẤU</h1>
                <div className="results-list">
                    {results.map((res, index) => (
                        <div key={index} className={`result-item ${res.isWinner ? 'winner' : ''}`}>
                            <span className="rank">#{index + 1}</span>
                            <span className="name">{res.name}</span>
                            <span className={`money ${res.change >= 0 ? 'plus' : 'minus'}`}>
                                {res.change >= 0 ? `+${res.change}` : res.change}
                            </span>
                        </div>
                    ))}
                </div>
                <button className="btn-restart" onClick={onRestart}>CHƠI TIẾP</button>
            </div>
        </div>
    );
};

export default EndGameModal;