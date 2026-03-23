import React, { useState } from 'react';
import './Opponent.css';

// Khai báo sẵn đường dẫn ảnh GIF để gõ cho lẹ và đỡ sai sót
const trollGifPaths = {
    'tomato': '/assets/trolls/Tomato Sauce Splat Sticker by Amor Design Studio.gif',
    'bomb': '/assets/trolls/Explode Digital Art Sticker.gif',
    'fire': '/assets/trolls/Fire Want Sticker by James Thacher.gif',
    'hit': '/assets/trolls/Knockout Sport Sticker by SHOWTIME Sports.gif',
    'slap': '/assets/trolls/Bitch Slap Slapping Sticker.gif',
    'slap2': '/assets/trolls/Bitch Slap Love Sticker by Pixel Parade App.gif',
    'nuclear': '/assets/trolls/End Of The World Fire Sticker by Willem Dafriend.gif'
};

const Opponent = ({isWaiting, playerKey, name, avatar, cardCount, position, isActive, timeLeft, hasPassed, onTroll, activeHit, hitId, money, moneyChange, endStatus, revealedCards, thoiHeoCardIds, isDisconnected }) => {    
    const [showTrollMenu, setShowTrollMenu] = useState(false);
    const cards = Array.from({ length: cardCount });

    const formatMoneyString = (amount) => {
        if (amount === null || amount === undefined) return '';
        return amount.toLocaleString('vi-VN') + ' VNĐ';
    };

    const handleTrollClick = (e, type) => {
        e.stopPropagation(); 
        setShowTrollMenu(false); 
        if (onTroll) {
            onTroll(playerKey, type);
        }
    };

    return (
        <div className={`opponent-wrapper ${position} ${hasPassed ? 'passed' : ''}`}>
            <div className="opp-profile">
                
                {/* KHU VỰC AVATAR (ẤN VÀO ĐỂ BẬT MENU TROLL) */}
                <div 
                    className={`avatar-circle ${isActive ? 'active-turn' : ''} ${endStatus || ''}`}
                    style={{ 
                        position: 'relative', cursor: 'pointer',
                        // 🟢 FIX 1: TẮT hoàn toàn filter xám ở thẻ cha để Menu Troll/GIF không bị mất màu
                        filter: 'none',
                        // 🟢 FIX 2: Ép vòng sáng màu xanh thành màu xám nếu đang rớt mạng
                        boxShadow: (isActive && isDisconnected) ? '0 0 15px rgba(128, 128, 128, 0.8)' : undefined,
                        borderColor: (isActive && isDisconnected) ? '#7f8c8d' : undefined
                    }} 
                    onClick={() => setShowTrollMenu(!showTrollMenu)} 
                >
                    {isWaiting && !isDisconnected && (
                        <div style={{
                            position: 'absolute', bottom: '-10px', left: '50%', transform: 'translateX(-50%)',
                            backgroundColor: '#555', color: '#fff', fontSize: '10px', fontWeight: 'bold',
                            padding: '2px 8px', borderRadius: '10px', border: '1px solid #fff', zIndex: 50
                        }}>
                            ĐANG XEM
                        </div>
                    )}
                    
                    {/* LỚP 1: ẢNH ĐẠI DIỆN THẬT */}
                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', position: 'absolute', top: 0, left: 0, zIndex: 0 }}>
                        <img 
                            src={avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`} 
                            alt={name} 
                            style={{ 
                                width: '100%', height: '100%', objectFit: 'cover',
                                // 🟢 FIX 3: Chỉ làm xám/đen đúng cái khuôn mặt bên trong
                                opacity: isWaiting ? 0.5 : 1,
                                filter: (isWaiting || isDisconnected || hasPassed) ? 'grayscale(100%) brightness(0.4)' : 'none',
                                transition: 'all 0.3s ease'
                            }} 
                        />
                    </div>

                    {/* LỚP 2: HUY HIỆU & ĐỒNG HỒ & NHÃN */}
                    <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%', pointerEvents: 'none' }}>
                        {endStatus === 'winner' && <div className="winner-badge">WINNER</div>}
                        {endStatus === 'loser' && <div className="loser-badge">LOSER</div>}
                        
                        {/* 🟢 FIX 4: ĐỒNG HỒ ĐẾM NGƯỢC - Vẫn đếm nhưng đổi sang màu xám nếu rớt mạng */}
                        {isActive && (
                            <div className="turn-timer-badge" style={{
                                backgroundColor: isDisconnected ? '#7f8c8d' : undefined,
                                color: isDisconnected ? '#fff' : undefined,
                                border: isDisconnected ? '2px solid #bdc3c7' : undefined
                            }}>
                                {timeLeft}
                            </div>
                        )}
                        
                        {hasPassed && <div className="opp-passed-badge" style={{borderRadius: 50}}>BỎ QUA</div>}
                        
                        {/* 🟢 FIX 5: NHÃN MẤT KẾT NỐI - Nền đen/xám mờ (Giống Hình 2) */}
                        {isDisconnected && (
                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                backgroundColor: 'rgba(0, 0, 0, 0.6)', // Nền đen mờ xuyên thấu
                                color: 'white',
                                padding: '5px 8px',
                                borderRadius: '20px',
                                border: '1px solid rgba(255, 255, 255, 0.5)', // Viền trắng mờ
                                fontSize: '13px',
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap',
                                zIndex: 60,
                                boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                                // 🟢 TRẢ LẠI HIỆU ỨNG NHẤP NHÁY Ở ĐÂY
                                animation: 'pulse-disconnect .5s infinite alternate'
                            }}>
                                🔌 Mất kết nối
                            </div>
                        )}
                    </div>
                    {/* LỚP 3: HIỆU ỨNG TIỀN BAY */}
                    {moneyChange !== null && (
                        <div className={`floating-money ${moneyChange > 0 ? 'win' : 'lose'}`} style={{zIndex: 20}}>
                            {moneyChange > 0 ? `+${formatMoneyString(moneyChange)}` : formatMoneyString(moneyChange)}
                        </div>
                    )}

                    {/* LỚP 4: BẢNG MENU CHỌN VŨ KHÍ */}
                    {showTrollMenu && (
                        <div className="troll-menu">
                            <span onClick={(e) => handleTrollClick(e, 'tomato')} title="Ném cà chua">🍅</span>
                            <span onClick={(e) => handleTrollClick(e, 'bomb')} title="Ném bom">💣</span>
                            <span onClick={(e) => handleTrollClick(e, 'fire')} title="Đốt cháy">🔥</span>
                            <span onClick={(e) => handleTrollClick(e, 'hit')} title="Đấm">🥊</span>
                            <span onClick={(e) => handleTrollClick(e, 'slap')} title="Tát vỡ mặt">👋</span>
                            <span onClick={(e) => handleTrollClick(e, 'slap2')} title="Tát kiểu 2">🐱</span>
                            <span onClick={(e) => handleTrollClick(e, 'nuclear')} title="Huỷ diệt hạt nhân">🚀</span>
                        </div>
                    )}

                    {/* LỚP 5: HIỆU ỨNG TROLL */}
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 30 }}>
                        {activeHit === 'tomato' && <div key={hitId} className="troll-effect tomato-splat" style={{ backgroundImage: `url('${trollGifPaths.tomato}')` }}></div>}
                        {activeHit === 'bomb' && <div key={hitId} className="troll-effect explosion" style={{ backgroundImage: `url('${trollGifPaths.bomb}')` }}></div>}
                        {activeHit === 'fire' && <div key={hitId} className="troll-effect burning" style={{ backgroundImage: `url('${trollGifPaths.fire}')` }}></div>}
                        {activeHit === 'hit' && <div key={hitId} className="troll-effect punch" style={{ backgroundImage: `url('${trollGifPaths.hit}')` }}></div>}
                        {activeHit === 'slap' && <div key={hitId} className="troll-effect slap-meme" style={{ backgroundImage: `url('${trollGifPaths.slap}')` }}></div>}
                        {activeHit === 'slap2' && <div key={hitId} className="troll-effect slap2-meme" style={{ backgroundImage: `url('${trollGifPaths.slap2}')` }}></div>}
                        {activeHit === 'nuclear' && <div key={hitId} className="troll-effect nuclear" style={{ backgroundImage: `url('${trollGifPaths.nuclear}')` }}></div>}
                    </div>
                </div>
                
                <div className="opp-info-text">
                    {/* 🟢 THÊM Ở ĐÂY: Nếu rớt mạng thì tên người chơi đổi màu đỏ xám */}
                    <div className="opp-name" style={{ color: isDisconnected ? '#c0392b' : 'inherit' }}>
                        {name}
                    </div>
                    <div className="opp-money">{money}</div>
                </div>
            </div>

            {/* KHU VỰC BÀI GIỮ NGUYÊN BÊN DƯỚI ... */}
            <div className={`opp-cards-fan ${revealedCards ? 'revealed' : ''}`}>
                {revealedCards ? (
                    revealedCards.map((card, index) => {
                        const isHeoThoi = thoiHeoCardIds ? thoiHeoCardIds.includes(card.id) : (card.value === '2');
                        const formattedValue = ['2','3','4','5','6','7','8','9'].includes(String(card.value)) ? `0${card.value}` : card.value;
                        
                        return (
                            <div key={index} className={`opp-card-back-wrapper ${isHeoThoi ? 'thoi-heo-glow' : ''}`} style={{ zIndex: isHeoThoi ? 50 : index }}>
                                <img src={`/assets/cards/Cards (large)/card_${card.suit}_${formattedValue}.png`} alt="card" />
                            </div>
                        );
                    })
                ) : (
                    cards.map((_, index) => {
                        const isLastCard = index === cardCount - 1;
                        return (
                            <div key={index} className="opp-card-back-wrapper">
                                <img src="/assets/cards/Cards (large)/card_back.png" alt="card back" />
                                {isLastCard && <span className="opp-card-count-text">{cardCount}</span>}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default Opponent;