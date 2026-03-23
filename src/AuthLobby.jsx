import React, { useState, useRef, useEffect } from 'react';
import './AuthLobby.css';
import io from 'socket.io-client';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
// ĐỔI CỔNG VỀ 5000 CHO KHỚP VỚI BACKEND HOẶC 5002 TÙY BẠN
const socket = io(BACKEND_URL);

// 🟢 NHẬN CÁC STATE ÂM THANH TỪ APP.JSX TRUYỀN XUỐNG
const AuthLobby = ({ onJoinGame, bgmVolume, setBgmVolume, sfxVolume, setSfxVolume, playlist, currentSongIndex }) => {
    
    const [user, setUser] = useState(() => {
        const savedSession = localStorage.getItem('tienlen_user_session');
        return savedSession ? JSON.parse(savedSession) : null;
    });
    
    const [isRegistering, setIsRegistering] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [serverError, setServerError] = useState('');
    const [editName, setEditName] = useState('');
    const [editAvatarUrl, setEditAvatarUrl] = useState('');
    const fileInputRef = useRef(null); 
    
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [showNumpadModal, setShowNumpadModal] = useState(false);
    const [joinId, setJoinId] = useState(''); 
    
    const [globalMessage, setGlobalMessage] = useState('');

    const [showBetModal, setShowBetModal] = useState(false);
    const betLevels = [10000, 20000, 50000, 100000, 200000, 500000];
    const [selectedBet, setSelectedBet] = useState(10000); 
    
    const [showGiftModal, setShowGiftModal] = useState(false);
    const [showGiftConfirm, setShowGiftConfirm] = useState(false);
    const [giftRecipient, setGiftRecipient] = useState('');
    const [giftAmount, setGiftAmount] = useState(0);
    const [giftError, setGiftError] = useState('');

    const giftLevels = [10000, 20000, 50000, 100000, 200000, 500000];
    
    const [confirmPassword, setConfirmPassword] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');
    
    const [toastMessage, setToastMessage] = useState(null);
    const [showPlaylist, setShowPlaylist] = useState(false);

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000); 
    };

    const handleExecuteGift = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/transfer-money`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sender: user.username,
                    recipient: giftRecipient.trim(),
                    amount: giftAmount
                })
            });
            
            const data = await response.json();
            if (data.success) {
                const updatedUser = { ...user, money: user.money - giftAmount };
                setUser(updatedUser);
                localStorage.setItem('tienlen_user_session', JSON.stringify(updatedUser));
                
                setShowGiftConfirm(false);
                setShowGiftModal(false);
                
                if (socket) {
                    socket.emit('global_announcement', {
                        message: `📢 TIN HOT: Đại gia [${user.name}] vừa hào phóng bơm ${giftAmount.toLocaleString('vi-VN')} VNĐ cho [${giftRecipient}]! Quá đẳng cấp! 💸`
                    });
                }
            } else {
                setGiftError(data.message);
                setShowGiftConfirm(false);
            }
        } catch (error) {
            setGiftError("❌ Lỗi kết nối Máy chủ!");
            setShowGiftConfirm(false);
            console.log(error);
        }
    };

    useEffect(() => {
        const savedSession = localStorage.getItem('tienlen_user_session');
        if (savedSession) {
            const parsedUser = JSON.parse(savedSession);
            setUser(parsedUser); 

            fetch(`${BACKEND_URL}/api/user/${parsedUser.username}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setUser(data.user); 
                        localStorage.setItem('tienlen_user_session', JSON.stringify(data.user)); 
                    }
                })
                .catch(err => console.error("Lỗi cập nhật số dư:", err));
        }
    }, []);

    useEffect(() => {
        if (user && socket) {
            const savedRoomId = localStorage.getItem('tienlen_saved_room');
            if (savedRoomId) {
                console.log("🔄 Đang khôi phục trận đấu tại phòng:", savedRoomId);
                socket.emit("join_room", { user, roomId: savedRoomId, action: 'join' }, (response) => {
                    if (response.success) {
                        onJoinGame(user, savedRoomId, socket, response.players, response.baseBet);
                    } else {
                        localStorage.removeItem('tienlen_saved_room');
                    }
                });
            }
        }
    }, [user]); 

    useEffect(() => {
        if (socket) {
            socket.on('receive_announcement', (data) => {
                setGlobalMessage(data.message); 
                setTimeout(() => {
                    setGlobalMessage('');
                }, 10000); 
            });
        }
        return () => {
            if (socket) socket.off('receive_announcement');
        };
    }, []);

    const handleAuth = async (e) => {
        e.preventDefault();
        
        setUsernameError(''); 
        setPasswordError(''); 
        setConfirmPasswordError(''); 
        setServerError('');
        
        let isValid = true;

        if (!username.trim()) { setUsernameError('Vui lòng nhập tên đăng nhập!'); isValid = false; }
        if (!password) { setPasswordError('Vui lòng nhập mật khẩu!'); isValid = false; } 
        else if (isRegistering && password.length < 6) { setPasswordError('Mật khẩu ít nhất 6 ký tự!'); isValid = false; }

        if (isRegistering) {
            if (!confirmPassword) {
                setConfirmPasswordError('Vui lòng xác nhận lại mật khẩu!');
                isValid = false;
            } else if (password !== confirmPassword) {
                setConfirmPasswordError('Mật khẩu xác nhận không trùng khớp!');
                isValid = false;
            }
        }

        if (!isValid) return; 

        const endpoint = isRegistering ? '/api/register' : '/api/login';
        try {
            const response = await fetch(`${BACKEND_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username, 
                    password, 
                    name: username,
                    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + username 
                })
            });
            const data = await response.json();
            
            if (data.success) {
                setUser(data.user);
                localStorage.setItem('tienlen_user_session', JSON.stringify(data.user)); 
            } else {
                setServerError(data.message); 
            }
        } catch (error) {
            setServerError("❌ Lỗi kết nối Máy chủ. Vui lòng kiểm tra lại Backend!");
            console.log(error);
        }
    }; 

    const handleLogout = () => {
        localStorage.removeItem('tienlen_user_session');
        setUser(null);
        setShowSettingsModal(false);
    };

    const handleShowLeaderboard = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/leaderboard`);
            const data = await response.json();
            if (data.success) {
                setLeaderboardData(data.leaderboard);
                setShowLeaderboard(true);
            }
        } catch (error) {
            showToast("❌ Không thể tải Bảng Xếp Hạng lúc này!");
            console.log(error);
        }
    };

    const handleJoinRoom = (roomId, action = 'join', baseBet = 10000) => {
        socket.emit("join_room", { user, roomId, action, baseBet }, (response) => {
            if (response.success) {
                onJoinGame(user, roomId, socket, response.players, response.baseBet); 
            } else {
                showToast(`❌ ${response.message}`);
                setJoinId(''); 
            }
        });
    };

    const confirmCreateRoom = (bet) => {
        const randomId = Math.floor(1000 + Math.random() * 9000).toString(); 
        handleJoinRoom(randomId, 'create', bet); 
        setShowBetModal(false);
    };

    const handleNumpadClick = (val) => {
        if (val === 'C') { setJoinId(prev => prev.slice(0, -1)); } 
        else if (val === 'OK') {
            if (joinId.length === 4) handleJoinRoom(joinId, 'join'); 
            else showToast("⚠️ Vui lòng nhập đủ 4 số!");
        } else {
            if (joinId.length < 4) setJoinId(prev => prev + val); 
        }
    };

    const openProfileModal = () => { setEditName(user.name); setEditAvatarUrl(user.avatar); setShowProfileModal(true); };
    
    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setIsSavingProfile(true); 
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_SIZE = 150; 
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
                    } else {
                        if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                    setEditAvatarUrl(compressedBase64);
                    
                    setIsSavingProfile(false); 
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    };

    const saveProfile = async () => {
        if (!editName.trim()) return showToast("⚠️ Tên không được để trống!");
        
        setIsSavingProfile(true); 

        try {
            const response = await fetch(`${BACKEND_URL}/api/update-profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: user.username,
                    name: editName,
                    avatar: editAvatarUrl
                })
            });

            const data = await response.json();
            
            if (data.success) {
                const updatedUser = { ...user, name: editName, avatar: editAvatarUrl };
                setUser(updatedUser);
                localStorage.setItem('tienlen_user_session', JSON.stringify(updatedUser));
                setShowProfileModal(false);
                showToast("✅ Lưu thành công!"); 
            } else {
                showToast("❌ Lỗi: " + data.message);
            }
        } catch (error) {
            console.error(error);
            showToast("❌ Lỗi kết nối Máy chủ khi lưu!");
        } finally {
            setIsSavingProfile(false); 
        }
    };

    if (!user) {
        return (
            <>
                <div className="portrait-warning">
                    <div style={{ fontSize: '50px', marginBottom: '20px' }}>🔄</div>
                    VUI LÒNG XOAY NGANG<br/>ĐIỆN THOẠI ĐỂ CHƠI GAME!
                </div>
                
                <div className="auth-lobby-container">
                    <form className="auth-box" onSubmit={handleAuth} style={{ position: 'relative' }}>
                        <div className="auth-logo">TIẾN LÊN VIP</div>
                        
                        {serverError && (
                            <div style={{
                                background: 'rgba(231, 76, 60, 0.15)', color: '#ff4757', border: '1px solid #ff4757',
                                padding: '10px', borderRadius: '8px', marginBottom: '15px', 
                                fontSize: '14px', fontWeight: 'bold', textAlign: 'center'
                            }}>{serverError}</div>
                        )}

                        <div style={{ width: '100%', marginBottom: '15px', textAlign: 'left' }}>
                            <input 
                                type="text" className="auth-input" placeholder="Tên đăng nhập" value={username} 
                                onChange={e => { setUsername(e.target.value); setUsernameError(''); setServerError(''); }} 
                                style={{ 
                                    width: '100%', marginBottom: '5px', 
                                    border: usernameError ? '2px solid #ff4757' : '', 
                                    backgroundColor: usernameError ? 'rgba(255, 71, 87, 0.05)' : '' 
                                }} 
                            />
                            {usernameError && <div style={{ color: '#ff4757', fontSize: '13px', fontWeight: 'bold', paddingLeft: '5px' }}>⚠️ {usernameError}</div>}
                        </div>

                        <div style={{ width: '100%', marginBottom: isRegistering ? '15px' : '20px', textAlign: 'left' }}>
                            <input 
                                type="password" className="auth-input" placeholder="Mật khẩu" value={password} 
                                onChange={e => { setPassword(e.target.value); setPasswordError(''); setServerError(''); }} 
                                style={{ 
                                    width: '100%', marginBottom: '5px', 
                                    border: passwordError ? '2px solid #ff4757' : '',
                                    backgroundColor: passwordError ? 'rgba(255, 71, 87, 0.05)' : '' 
                                }} 
                            />
                            {passwordError && <div style={{ color: '#ff4757', fontSize: '13px', fontWeight: 'bold', paddingLeft: '5px' }}>⚠️ {passwordError}</div>}
                        </div>
                        
                        {isRegistering && (
                            <div style={{ width: '100%', marginBottom: '20px', textAlign: 'left' }}>
                                <input 
                                    type="password" className="auth-input" placeholder="Xác nhận mật khẩu" value={confirmPassword} 
                                    onChange={e => { setConfirmPassword(e.target.value); setConfirmPasswordError(''); setServerError(''); }} 
                                    style={{ 
                                        width: '100%', marginBottom: '5px', 
                                        border: confirmPasswordError ? '2px solid #ff4757' : '',
                                        backgroundColor: confirmPasswordError ? 'rgba(255, 71, 87, 0.05)' : '' 
                                    }} 
                                />
                                {confirmPasswordError && <div style={{ color: '#ff4757', fontSize: '13px', fontWeight: 'bold', paddingLeft: '5px' }}>⚠️ {confirmPasswordError}</div>}
                            </div>
                        )}

                        <button type="submit" className="btn-auth">{isRegistering ? 'ĐĂNG KÝ NGAY' : 'ĐĂNG NHẬP'}</button>
                        
                        <div className="toggle-auth" onClick={() => { 
                            setIsRegistering(!isRegistering); 
                            setUsernameError(''); 
                            setPasswordError(''); 
                            setConfirmPasswordError(''); 
                            setServerError(''); 
                            setPassword('');
                            setConfirmPassword('');
                        }}>
                            {isRegistering ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký nhận 500k'}
                        </div>
                    </form>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="portrait-warning">
                <div style={{ fontSize: '50px', marginBottom: '20px' }}>🔄</div>
                VUI LÒNG XOAY NGANG<br/>ĐIỆN THOẠI ĐỂ CHƠI GAME!
            </div>
            
            <div className="auth-lobby-container">
                {globalMessage && (
                    <div className="global-announcement-bar">
                        <div className="global-announcement-text">
                            {globalMessage}
                        </div>
                    </div>
                )}
                
                {showProfileModal && ( 
                <div className="profile-modal-overlay">
                    <div className="profile-modal" style={{ position: 'relative' }}> 
                        
                        {isSavingProfile && (
                            <div className="modal-loading-overlay">
                                <div className="loading-spinner-large"></div>
                            </div>
                        )}

                        <h2>THÔNG TIN CỦA BẠN</h2>
                        <div className="avatar-edit-container" onClick={() => fileInputRef.current.click()}>
                            <img src={editAvatarUrl} alt="Preview" className="avatar-preview" />
                            <div className="avatar-edit-icon">📷</div>
                            <input type="file" accept="image/*" className="file-input-hidden" ref={fileInputRef} onChange={handleImageSelect} />
                        </div>
                        <input type="text" className="auth-input" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nhập tên hiển thị mới" maxLength="15"/>
                        <button className="btn-save-profile" onClick={saveProfile}>LƯU THAY ĐỔI</button>
                        <button className="btn-close-modal" onClick={() => setShowProfileModal(false)}>Hủy bỏ</button>
                    </div>
                </div>
            )}

                {showSettingsModal && ( 
                    <div className="profile-modal-overlay">
                        <div className="profile-modal">
                            <h2>CÀI ĐẶT GAME</h2>
                            <div className="settings-options">
                                <label className="setting-row"><input type="checkbox" defaultChecked /> Bật hiệu ứng Rung màn hình</label>
                                
                                <div className="volume-control">
                                    <div className="volume-label"><span>🔊 Âm hiệu ứng</span><span>{sfxVolume}%</span></div>
                                    <input 
                                        type="range" min="0" max="100" 
                                        value={sfxVolume} 
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            setSfxVolume(val);
                                            localStorage.setItem('tienlen_sfx_volume', val);
                                        }} 
                                        className="styled-slider" 
                                    />
                                </div>

                                <div className="volume-control">
                                    <div className="volume-label"><span>🎵 Nhạc nền</span><span>{bgmVolume}%</span></div>
                                    <input 
                                        type="range" min="0" max="100" 
                                        value={bgmVolume} 
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            setBgmVolume(val);
                                            localStorage.setItem('tienlen_bgm_volume', val);
                                        }} 
                                        className="styled-slider" 
                                    />
                                </div>
                            </div>
                            <button className="btn-save-profile" style={{background: '#ff4444', color: '#fff', boxShadow: '0 4px 0 #cc0000', marginTop: '20px'}} onClick={handleLogout}>ĐĂNG XUẤT</button>
                            <button className="btn-close-modal" onClick={() => setShowSettingsModal(false)}>Đóng</button>
                        </div>
                    </div>
                )}

                {showNumpadModal && (
                    <div className="profile-modal-overlay">
                        <div className="numpad-modal">
                            <h2 style={{color: '#ffd700', marginBottom: '15px', marginTop: 0}}>NHẬP ID PHÒNG</h2>
                            <div className="numpad-display">
                                {joinId.padEnd(4, '_').split('').map((char, index) => (
                                    <span key={index} className="numpad-char">{char}</span>
                                ))}
                            </div>
                            <div className="numpad-grid">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'].map((btn) => (
                                    <button key={btn} className={`numpad-btn ${btn === 'OK' ? 'btn-ok' : ''} ${btn === 'C' ? 'btn-clear' : ''}`} onClick={() => handleNumpadClick(btn)}>{btn}</button>
                                ))}
                            </div>
                            <button className="btn-close-modal" onClick={() => {setShowNumpadModal(false); setJoinId('');}}>Đóng</button>
                        </div>
                    </div>
                )}

                {showGiftModal && (
                    <div className="profile-modal-overlay">
                        <div className="numpad-modal" style={{ 
                            width: '450px', background: 'linear-gradient(135deg, #2c0404, #1a0202)', 
                            border: '2px solid #e74c3c', boxShadow: '0 10px 40px rgba(231, 76, 60, 0.3)'
                        }}>
                            <h2 style={{color: '#ff4757', textAlign: 'center', marginBottom: '20px', marginTop: 0, textTransform: 'uppercase'}}>
                                🎁 BƠM MÁU CHO ĐỒNG ĐỘI
                            </h2>

                            {giftError && <div style={{ background: 'rgba(231,76,60,0.2)', color: '#ff4757', padding: '10px', borderRadius: '8px', marginBottom: '15px', textAlign: 'center', fontWeight: 'bold' }}>{giftError}</div>}

                            <input 
                                type="text" 
                                placeholder="Nhập Tên đăng nhập người nhận..." 
                                value={giftRecipient} 
                                onChange={e => {setGiftRecipient(e.target.value); setGiftError('');}}
                                style={{ width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1px solid #e74c3c', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '16px', marginBottom: '20px' }}
                            />

                            <div style={{ background: 'rgba(231, 76, 60, 0.1)', border: '2px dashed #e74c3c', padding: '15px', borderRadius: '12px', textAlign: 'center', marginBottom: '20px' }}>
                                <div style={{ color: '#bdc3c7', fontSize: '14px', marginBottom: '5px' }}>TỔNG TIỀN MUỐN TẶNG</div>
                                <div style={{ color: '#2ecc71', fontSize: '32px', fontWeight: 'bold' }}>
                                    {giftAmount.toLocaleString('vi-VN')} đ
                                </div>
                                <button onClick={() => setGiftAmount(0)} style={{ background: 'transparent', color: '#e74c3c', border: 'none', cursor: 'pointer', marginTop: '5px', textDecoration: 'underline' }}>Xóa làm lại</button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '25px' }}>
                                {giftLevels.map(amount => (
                                    <button 
                                        key={amount} 
                                        onClick={() => { setGiftAmount(prev => prev + amount); setGiftError(''); }}
                                        style={{
                                            background: 'rgba(231, 76, 60, 0.2)', color: '#ff4757', border: '1px solid #ff4757',
                                            padding: '12px 5px', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer',
                                            transition: 'transform 0.1s'
                                        }}
                                        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                                        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        +{amount >= 1000000 ? `${amount/1000000}Tr` : `${amount/1000}K`}
                                    </button>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: '15px' }}>
                                <button onClick={() => setShowGiftModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: '#333', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>HỦY BỎ</button>
                                <button 
                                    onClick={() => {
                                        if (!giftRecipient.trim()) return setGiftError("Vui lòng nhập người nhận!");
                                        if (giftAmount <= 0) return setGiftError("Vui lòng bấm chọn số tiền!");
                                        if (giftAmount > user.money) return setGiftError("Số dư của bạn không đủ!");
                                        if (giftRecipient === user.username) return setGiftError("Không thể tự tặng cho mình!");
                                        setShowGiftConfirm(true); 
                                    }} 
                                    style={{ flex: 2, padding: '12px', borderRadius: '10px', background: 'linear-gradient(180deg, #e74c3c, #c0392b)', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(231, 76, 60, 0.5)' }}
                                >
                                    GỬI QUÀ
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showGiftConfirm && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                        backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #1e272e, #2f3640)', border: '2px solid #f39c12',
                            borderRadius: '20px', padding: '30px', width: '400px', textAlign: 'center',
                            boxShadow: '0 10px 40px rgba(243, 156, 18, 0.4)'
                        }}>
                            <div style={{ fontSize: '50px', marginBottom: '10px' }}>🤔</div>
                            <h2 style={{ color: '#f39c12', marginTop: 0 }}>XÁC NHẬN GIAO DỊCH</h2>
                            <p style={{ color: '#fff', fontSize: '18px', lineHeight: '1.6' }}>
                                Bạn có chắc chắn muốn chuyển <br/>
                                <strong style={{ color: '#2ecc71', fontSize: '24px' }}>{giftAmount.toLocaleString('vi-VN')} đ</strong><br/>
                                cho người chơi <strong style={{ color: '#f39c12' }}>{giftRecipient}</strong> không?
                            </p>
                            <div style={{ display: 'flex', gap: '15px', marginTop: '25px' }}>
                                <button onClick={() => setShowGiftConfirm(false)} style={{ flex: 1, padding: '12px', background: '#95a5a6', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>QUAY LẠI</button>
                                <button onClick={handleExecuteGift} style={{ flex: 1, padding: '12px', background: '#2ecc71', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(46, 204, 113, 0.5)' }}>CHẮC CHẮN</button>
                            </div>
                        </div>
                    </div>
                )}

                {showBetModal && (
                    <div className="profile-modal-overlay">
                        <div className="numpad-modal" style={{ 
                            width: '420px', background: 'linear-gradient(135deg, #2b1b04, #1a1002)', 
                            border: '2px solid #f1c40f', boxShadow: '0 10px 30px rgba(241, 196, 15, 0.2)'
                        }}>
                            <h2 style={{color: '#ffd700', textAlign: 'center', marginBottom: '20px', marginTop: 0, textTransform: 'uppercase', textShadow: '0 2px 4px rgba(0,0,0,0.8)'}}>
                                CHỌN MỨC CƯỢC
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', padding: '5px' }}>
                                {betLevels.map(bet => {
                                    const isSelected = selectedBet === bet;
                                    return (
                                        <button 
                                            key={bet} onClick={() => setSelectedBet(bet)}
                                            style={{
                                                background: isSelected ? 'linear-gradient(180deg, #f1c40f, #e67e22)' : 'rgba(0,0,0,0.5)',
                                                color: isSelected ? '#000' : '#f1c40f', border: isSelected ? '2px solid #fff' : '2px solid #f1c40f',
                                                padding: '15px', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer',
                                                boxShadow: isSelected ? '0 0 15px rgba(241, 196, 15, 0.8)' : 'none', transition: 'all 0.2s ease',
                                            }}
                                        >
                                            {bet.toLocaleString('vi-VN')} đ
                                        </button>
                                    );
                                })}
                            </div>
                            <div style={{ display: 'flex', gap: '15px', marginTop: '25px' }}>
                                <button onClick={() => setShowBetModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: '#333', color: '#fff', border: '1px solid #666', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>HỦY BỎ</button>
                                <button onClick={() => confirmCreateRoom(selectedBet)} style={{ flex: 2, padding: '12px', borderRadius: '10px', background: 'linear-gradient(180deg, #2ecc71, #27ae60)', color: '#fff', border: '2px solid #fff', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(46, 204, 113, 0.5)' }}>XÁC NHẬN TẠO</button>
                            </div>
                        </div>
                    </div>
                )}

                {showLeaderboard && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                        backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1001, display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #1e272e, #2f3640)', width: '450px', maxWidth: '90%', borderRadius: '20px',
                            border: '2px solid #f1c40f', padding: '20px', boxShadow: '0 10px 40px rgba(0,0,0,0.9)', position: 'relative'
                        }}>
                            <button onClick={() => setShowLeaderboard(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '50%', width: '35px', height: '35px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>X</button>
                            <h2 style={{ color: '#f1c40f', textAlign: 'center', margin: '0 0 20px 0', textTransform: 'uppercase', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>🏆 Top 10 Đại Gia</h2>
                            <div className="leaderboard-scroll" style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '5px' }}>
                                {leaderboardData.map((player, index) => {
                                    let rankIcon = <span style={{fontSize: '20px', fontWeight: 'bold', color: '#bdc3c7'}}>#{index + 1}</span>;
                                    if (index === 0) rankIcon = <span style={{fontSize: '28px'}}>🥇</span>;
                                    else if (index === 1) rankIcon = <span style={{fontSize: '28px'}}>🥈</span>;
                                    else if (index === 2) rankIcon = <span style={{fontSize: '28px'}}>🥉</span>;

                                    return (
                                        <div key={player.username} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            background: index === 0 ? 'rgba(241, 196, 15, 0.2)' : 'rgba(255,255,255,0.05)',
                                            border: index === 0 ? '1px solid #f1c40f' : '1px solid #555',
                                            padding: '10px 15px', borderRadius: '15px', marginBottom: '10px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <div style={{ width: '40px', textAlign: 'center' }}>{rankIcon}</div>
                                                <img src={player.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} alt={player.name} style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff' }}/>
                                                <div style={{ color: 'white', fontWeight: 'bold', fontSize: '18px' }}>
                                                    {player.name} {user && user.username === player.username && <span style={{ color: '#2ecc71', fontSize: '12px', marginLeft: '5px' }}>(Bạn)</span>}
                                                </div>
                                            </div>
                                            <div style={{ color: '#f1c40f', fontWeight: 'bold', fontSize: '18px' }}>{player.money.toLocaleString('vi-VN')} đ</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                <div className="lobby-screen">
                    <div className="lobby-topbar">
                        <div className="user-profile">
                            <div className="default-avatar clickable" style={{ backgroundImage: `url(${user.avatar})`, backgroundPosition: 'center', backgroundSize: 'cover' }} onClick={openProfileModal} title="Nhấn để đổi Avatar/Tên"></div>
                            <div className="user-info">
                                <h3>{user.name}</h3>
                                <p>Đại gia Tiến Lên</p> 
                            </div>
                        </div>
                        
                        <div className="user-wallet" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
                            <div className="wallet-money">{user.money.toLocaleString('vi-VN')} <span className="wallet-label">VNĐ</span></div>
                        </div>
                         
                        <div className="lobby-settings">
                            <div 
                                onClick={() => { setShowGiftModal(true); setGiftAmount(0); setGiftRecipient(''); setGiftError(''); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                                    background: 'rgba(0, 0, 0, 0.4)', padding: '6px 15px', borderRadius: '30px',
                                    marginRight: '15px', border: '1px solid rgba(231, 76, 60, 0.3)',
                                    transition: 'all 0.2s ease', userSelect: 'none'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(231, 76, 60, 0.15)'; e.currentTarget.style.border = '1px solid #e74c3c'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)'; e.currentTarget.style.border = '1px solid rgba(231, 76, 60, 0.3)'; e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                                <span style={{ fontSize: '20px', filter: 'drop-shadow(0 0 5px #e74c3c)' }}>🎁</span>
                                <span style={{ color: '#e74c3c', fontWeight: 'bold', fontSize: '15px', letterSpacing: '1px' }}>TẶNG</span>
                            </div>
                            <div 
                                className="btn-leaderboard" onClick={handleShowLeaderboard}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                                    background: 'rgba(0, 0, 0, 0.4)', padding: '6px 15px', borderRadius: '30px',
                                    marginRight: '30px', border: '1px solid rgba(241, 196, 15, 0.3)',
                                    transition: 'all 0.2s ease', userSelect: 'none'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(241, 196, 15, 0.15)'; e.currentTarget.style.border = '1px solid #f1c40f'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)'; e.currentTarget.style.border = '1px solid rgba(241, 196, 15, 0.3)'; e.currentTarget.style.transform = 'scale(1)'; }}
                            >   
                                <span style={{ fontSize: '20px', filter: 'drop-shadow(0 0 5px #f1c40f)' }}>🏆</span>
                                <span style={{ color: '#f1c40f', fontWeight: 'bold', fontSize: '15px', letterSpacing: '1px' }}>BXH</span>
                            </div>

                            <div style={{ position: 'relative' }}>
                                <button 
                                    className="btn-icon" title="Danh sách Nhạc nền" onClick={() => setShowPlaylist(!showPlaylist)}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    🎵
                                </button>

                                {showPlaylist && (
                                    <div style={{
                                        position: 'absolute', top: '50px', right: '-10px', width: '250px',
                                        background: 'rgba(20, 30, 48, 0.95)', border: '1px solid #f1c40f',
                                        borderRadius: '12px', padding: '15px', zIndex: 1000,
                                        boxShadow: '0 8px 25px rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)'
                                    }}>
                                        <h4 style={{ color: '#f1c40f', margin: '0 0 10px 0', textAlign: 'center', fontSize: '15px', textTransform: 'uppercase', borderBottom: '1px solid rgba(241,196,15,0.3)', paddingBottom: '10px' }}>
                                            🎧 Đang Phát
                                        </h4>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {playlist.map((song, index) => {
                                                const isPlaying = index === currentSongIndex;
                                                return (
                                                    <div key={song.id} style={{
                                                        display: 'flex', alignItems: 'center', gap: '10px',
                                                        padding: '8px 10px', borderRadius: '8px',
                                                        background: isPlaying ? 'rgba(46, 204, 113, 0.15)' : 'transparent',
                                                        border: isPlaying ? '1px solid #2ecc71' : '1px solid transparent',
                                                        color: isPlaying ? '#2ecc71' : '#bdc3c7',
                                                        fontSize: '14px', fontWeight: isPlaying ? 'bold' : 'normal',
                                                        cursor: 'default', overflow: 'hidden'
                                                    }}>
                                                        <span style={{ fontSize: '16px', opacity: isPlaying ? 1 : 0.3, flexShrink: 0 }}>
                                                            {isPlaying ? '🎶' : '🎵'}
                                                        </span>
                                                        <div className={isPlaying ? "marquee-container" : ""} style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: !isPlaying ? 'ellipsis' : 'clip' }}>
                                                            <div className={isPlaying ? "marquee-text" : ""}>
                                                                {song.title}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button className="btn-icon" title="Cài đặt" onClick={() => setShowSettingsModal(true)}>⚙️</button>
                        </div>
                    </div>

                    <div className="lobby-content">
                        <div className="room-card" onClick={() => handleJoinRoom('main', 'create')}>
                            <div className="room-icon">🃏</div>
                            <div className="room-title">CHƠI NGAY</div>
                            <div className="room-desc">Vào bàn ngẫu nhiên</div>
                        </div>

                       <div className="room-card" onClick={() => setShowBetModal(true)}> 
                            <div className="room-icon">🏠</div>
                            <div className="room-title">TẠO PHÒNG</div>
                            <div className="room-desc">Chọn mức cược</div>
                        </div>

                        <div className="room-card" onClick={() => setShowNumpadModal(true)}>
                            <div className="room-icon">🔑</div>
                            <div className="room-title">VÀO PHÒNG</div>
                            <div className="room-desc">Nhập ID bằng phím ảo</div>
                        </div>
                    </div>
                </div>
                {toastMessage && (
                    <div className="custom-toast-notification">
                        {toastMessage}
                    </div>
                )}
            </div>
        </>
    );
};

export default AuthLobby;