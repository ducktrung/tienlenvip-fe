import React, { useState, useEffect, useRef } from 'react';
import PlayerHand from './components/PlayerHand';
import Card from './components/Card'; 
import Opponent from './components/Opponent';
import AuthLobby from './AuthLobby'; 
import { sortCards, canPlayCards, createShuffledDeck, findValidPlay, checkToiTrang } from './utils/tienLenLogic';
import './App.css';
import NoSleep from 'nosleep.js';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();
const audioBuffers = {};
const soundUrls = {
    'slide': '/assets/sounds/card-slide-1.ogg',
    'play': '/assets/sounds/card-place-1.ogg',
    'heo': '/assets/sounds/heo.mp3',       
    'chat': '/assets/sounds/electric-shock-sound-effect1.mp3',
    'bao': '/assets/sounds/tindeck_11.mp3',     
    'laugh': '/assets/sounds/cat-laugh-meme-11.mp3', 
    'cry': '/assets/sounds/sad-meow-song1.mp3'      
};

Object.keys(soundUrls).forEach(async (key) => {
    try {
        const response = await fetch(soundUrls[key]);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        audioBuffers[key] = await audioCtx.decodeAudioData(arrayBuffer);
    } catch (error) {
        console.warn(`⚠️ Bỏ qua âm thanh [${key}]`);
    }
});

const trollGifPaths = {
    'tomato': '/assets/trolls/Tomato Sauce Splat Sticker by Amor Design Studio.gif',
    'bomb': '/assets/trolls/Explode Digital Art Sticker.gif',
    'fire': '/assets/trolls/Fire Want Sticker by James Thacher.gif',
    'hit': '/assets/trolls/Knockout Sport Sticker by SHOWTIME Sports.gif',
    'slap': '/assets/trolls/Bitch Slap Slapping Sticker.gif',
    'slap2': '/assets/trolls/Bitch Slap Love Sticker by Pixel Parade App.gif',
    'nuclear': '/assets/trolls/End Of The World Fire Sticker by Willem Dafriend.gif'
};

Object.values(trollGifPaths).forEach(src => {
    const img = new Image();
    img.src = src;
});

const playSound = (type) => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const buffer = audioBuffers[type];
    if (buffer) {
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        const gainNode = audioCtx.createGain();
        const savedSfxVolume = localStorage.getItem('tienlen_sfx_volume');
        gainNode.gain.value = savedSfxVolume !== null ? parseInt(savedSfxVolume, 10) / 100 : 0.8;
        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        source.start(0); 
    }
};
// 🟢 TỐI ƯU 1: ÉP VƯỢT RÀO AUTO-PLAY CỦA IOS SAFARI
// 🟢 TỐI ƯU WEBRTC CHO MAC & IPHONE (CHỐNG LỖI ABORTERROR)
// 🟢 TỐI ƯU 1: GỌI PLAY TRỰC TIẾP, BỎ QUA ONLOADEDMETADATA
// 🟢 TỐI ƯU 3: BẢN AUDIO PLAYER BẤT TỬ
const AudioPlayer = ({ stream }) => {
    const audioRef = useRef(null);
    
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !stream) return;

        console.log("🔊 Đã gắn luồng âm thanh vào thẻ Audio");
        audio.srcObject = stream;
        
        // CÚ CHỐT: Ép mở khóa âm lượng, bất chấp React có cache hay không
        audio.muted = false; 
        audio.volume = 1.0;

        // Dùng vòng lặp thử phát liên tục cho đến khi user chạm vào màn hình
        const playAttempt = setInterval(() => {
            audio.play()
                .then(() => {
                    console.log("✅ ĐÃ PHÁT ĐƯỢC TIẾNG MIC!");
                    clearInterval(playAttempt); // Phát được rồi thì dừng vòng lặp
                })
                .catch(() => console.log("⏳ Chờ Sếp chạm vào màn hình để mở loa..."));
        }, 1000);

        return () => clearInterval(playAttempt);
    }, [stream]);

    // Lột bỏ toàn bộ CSS rườm rà, tự nó tàng hình!
    return <audio ref={audioRef} autoPlay playsInline />;
};
const delay = ms => new Promise(res => setTimeout(res, ms));

const FloatingEmoji = ({ data }) => {
    const posMap = {
        bottom: { left: '15%', top: '70%' }, 
        left:   { left: '10%', top: '35%' }, 
        top:    { left: '50%', top: '15%' }, 
        right:  { left: '90%', top: '35%' }  
    };
    const pos = posMap[data.player];
    return (
        <div className="floating-emoji" style={{ left: pos.left, top: pos.top }}>
            {data.icon}
        </div>
    );
};

const FlyingTroll = ({ troll }) => {
    const posMap = {
        bottom: { left: '15%', top: '85%' }, 
        left:   { left: '10%', top: '50%' }, 
        top:    { left: '50%', top: '15%' }, 
        right:  { left: '90%', top: '50%' }  
    };
    const [pos, setPos] = useState(posMap[troll.from]);

    useEffect(() => {
        const timer = setTimeout(() => setPos(posMap[troll.to]), 50); 
        return () => clearTimeout(timer);
    }, [troll.to, troll.from]);

    return (
        <div className={`flying-troll flying-${troll.type}`} style={{ left: pos.left, top: pos.top }}>
            {troll.type === 'tomato' && '🍅'}
            {troll.type === 'bomb' && '💣'}
            {troll.type === 'fire' && '🔥'}
            {troll.type === 'hit' && '🥊'}
            {troll.type === 'slap' && '👋'}
            {troll.type === 'slap2' && '🩴'}
            {troll.type === 'nuclear' && '🚀'}
        </div>
    );
};

// 🟢 DANH SÁCH NHẠC NỀN CHUYỂN TỪ LOBBY SANG
const playlist = [
    { id: 1, title: 'Nỗi Đau Đính Kèm - Anh Tú ATUS', src: '/assets/sounds/noidaudinhkem.mp3' },
    { id: 2, title: 'Trước Khi Em Tồn Tại (Piano Version) - Thắng _ Việt Anh Cover', src: '/assets/sounds/truockhiemtontai.mp3' },
    { id: 3, title: 'ĐỪNG LÀM TRÁI TIM ANH ĐAU - SƠN TÙNG M-TP', src: '/assets/sounds/dunglamtraitimanhdau.mp3' },
    { id: 4, title: 'WRONG TIMES - PUPPY & DANGRANGTO', src: '/assets/sounds/wrongtimes.mp3' },
    { id: 5, title: 'MẶT MỘC _ Phạm Nguyên Ngọc x VAnh x Ân Nhi (Original)', src: '/assets/sounds/matmoc.mp3' },
    { id: 6, title: 'Mất Kết Nối - Dương Domic', src: "/assets/sounds/matketnoi.mp3" },
    { id: 7, title: 'Chìm Sâu - RPT MCK (feat. Trung Trần) _ Official', src: '/assets/sounds/chimsau.mp3' },
    { id: 8, title: 'Rolling Down - CAPTAIN - Team B Ray', src: '/assets/sounds/rollingdown.mp3' }
];

function App() {
    useEffect(() => {
        const preloadImages = () => {
            const suits = ['spades', 'clubs', 'diamonds', 'hearts'];
            const values = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
            const imageUrls = ['/assets/cards/Cards (large)/card_back.png']; 
            
            suits.forEach(suit => {
                values.forEach(value => {
                    const formattedValue = ['2','3','4','5','6','7','8','9'].includes(value) ? `0${value}` : value;
                    imageUrls.push(`/assets/cards/Cards (large)/card_${suit}_${formattedValue}.png`);
                });
            });

            imageUrls.forEach(url => {
                const img = new Image();
                img.src = url;
            });
        };
        preloadImages();
    }, []);

  const [gameState, setGameState] = useState('waiting'); 
  const [currentTurn, setCurrentTurn] = useState(null); 
  const [timeLeft, setTimeLeft] = useState(0);
  const [passedPlayers, setPassedPlayers] = useState([]); 
  const [lastPlayedTurn, setLastPlayedTurn] = useState(null); 
  const [hand, setHand] = useState([]); 
  const [selectedCardIds, setSelectedCardIds] = useState([]);
  const [tablePlays, setTablePlays] = useState([]); 

  // ==========================================================
  // 🟢 HỆ THỐNG QUẢN LÝ NHẠC VÀ ÂM LƯỢNG GLOBAL
  // ==========================================================
    const globalAudioRef = useRef(null);
    const [showSettings, setShowSettings] = useState(false);
    
    // Random bài hát ngay khi vừa load web
    const [currentSongIndex, setCurrentSongIndex] = useState(() => Math.floor(Math.random() * playlist.length));

    const [bgmVolume, setBgmVolume] = useState(() => {
        const saved = localStorage.getItem('tienlen_bgm_volume');
        return saved !== null ? parseInt(saved, 10) : 80;
    });

    const [sfxVolume, setSfxVolume] = useState(() => {
        const saved = localStorage.getItem('tienlen_sfx_volume');
        return saved !== null ? parseInt(saved, 10) : 80;
    });

    // Hết bài thì nhảy sang bài Random khác (không lặp lại bài cũ)
    const handleSongEnd = () => {
        setCurrentSongIndex((prev) => {
            let next;
            do { next = Math.floor(Math.random() * playlist.length); } while (next === prev && playlist.length > 1);
            return next;
        });
    };

  // 🟢 TỰ ĐỘNG BẬT NHẠC NGAY KHI VỪA ĐĂNG NHẬP THÀNH CÔNG
  useEffect(() => {
      const checkMusicInterval = setInterval(() => {
          const hasSession = localStorage.getItem('tienlen_user_session');
          const audio = globalAudioRef.current;
          
          if (audio) {
              if (hasSession) {
                  if (audio.paused) audio.play().catch(() => {});
              } else {
                  if (!audio.paused) audio.pause();
              }
          }
      }, 1000);

      const unlockMusic = () => {
          const hasSession = localStorage.getItem('tienlen_user_session');
          if (hasSession && globalAudioRef.current && globalAudioRef.current.paused) {
              globalAudioRef.current.play().catch(() => {});
          }
          document.removeEventListener('click', unlockMusic);
          document.removeEventListener('touchstart', unlockMusic);
      };
      
      document.addEventListener('click', unlockMusic);
      document.addEventListener('touchstart', unlockMusic);

      return () => {
          clearInterval(checkMusicInterval);
          document.removeEventListener('click', unlockMusic);
          document.removeEventListener('touchstart', unlockMusic);
      };
  }, [currentSongIndex]);

  // ==========================================================

  const [opponentCards, setOpponentCards] = useState({ left: 0, top: 0, right: 0 });
  const [opponentsHand, setOpponentsHand] = useState({ left: [], top: [], right: [] });
  const [isInvalidPlay, setIsInvalidPlay] = useState(false);

  const isClearingRef = useRef(false);
  const localStreamRef = useRef(null); 
  const peersRef = useRef({});         
  const iceQueuesRef = useRef({}); 
  const [remoteStreams, setRemoteStreams] = useState({}); 
  // 🟢 TỐI ƯU 2: DÀN MÁY CHỦ TRUNG CHUYỂN ĐỂ MAC VÀ IPHONE TÌM THẤY NHAU
  const rtcConfig = { 
      iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // NÉM THÔNG TIN TURN SERVER SẾP VỪA ĐĂNG KÝ VÀO ĐÂY:
        {
        urls: "stun:stun.relay.metered.ca:80",
      },
      {
        urls: "turn:global.relay.metered.ca:80",
        username: "228a609608aaf6d0be670622",
        credential: "biKs3cwrlrfAWk7z",
      },
      {
        urls: "turn:global.relay.metered.ca:80?transport=tcp",
        username: "228a609608aaf6d0be670622",
        credential: "biKs3cwrlrfAWk7z",
      },
      {
        urls: "turn:global.relay.metered.ca:443",
        username: "228a609608aaf6d0be670622",
        credential: "biKs3cwrlrfAWk7z",
      },
      {
        urls: "turns:global.relay.metered.ca:443?transport=tcp",
        username: "228a609608aaf6d0be670622",
        credential: "biKs3cwrlrfAWk7z",
      },
      ] 
  };
  const [trolls, setTrolls] = useState([]);
  const [emojis, setEmojis] = useState([]); 
  const [showEmojiMenu, setShowEmojiMenu] = useState(false); 

  const [showChatMenu, setShowChatMenu] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [activeChats, setActiveChats] = useState([]); 
  const [isMicOn, setIsMicOn] = useState(false); 
  const [winMessage, setWinMessage] = useState(null);
  const [playerMoney, setPlayerMoney] = useState({ bottom: 500000, left: 1200000, top: 800000, right: 2500000 });
  
  const [toastMessage, setToastMessage] = useState(null);
  const [topAlert, setTopAlert] = useState(null);
  const showToast = (msg) => {
      setToastMessage(msg);
      playSound('bao'); 
      setTimeout(() => { setToastMessage(null); }, 3000);
  };

  const [isDragMode, setIsDragMode] = useState(false); 
  const [moneyChanges, setMoneyChanges] = useState({ bottom: null, left: null, top: null, right: null });
  const [inLobby, setInLobby] = useState(true); 
  const [currentUser, setCurrentUser] = useState(null); 
  const [socket, setSocket] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [roomPlayers, setRoomPlayers] = useState([]); 
  const [thoiHeoCardIds, setThoiHeoCardIds] = useState([]); 
  const [chopEvent, setChopEvent] = useState(null); 
  const [baseBet, setBaseBet] = useState(10000); 
  const [lastWinner, setLastWinner] = useState('bottom');
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const [showBankruptAlert, setShowBankruptAlert] = useState(false);
  const [showBrokeModal, setShowBrokeModal] = useState(false);

  const bgmGainNodeRef = useRef(null);
  const bgmSourceRef = useRef(null);

  useEffect(() => {
      if (globalAudioRef.current && !bgmSourceRef.current) {
          try {
              bgmSourceRef.current = audioCtx.createMediaElementSource(globalAudioRef.current);
              bgmGainNodeRef.current = audioCtx.createGain();
              bgmSourceRef.current.connect(bgmGainNodeRef.current);
              bgmGainNodeRef.current.connect(audioCtx.destination);
          } catch (e) {
              console.log("Đã kết nối luồng âm thanh");
          }
      }
  }, []);

  useEffect(() => {
      if (bgmGainNodeRef.current) {
          if (audioCtx.state === 'suspended') audioCtx.resume(); 
          const baseVol = bgmVolume / 100;
          bgmGainNodeRef.current.gain.value = inLobby ? baseVol : baseVol * 0.15;
      }
  }, [bgmVolume, inLobby]);
  
  const formatMoney = (amount) => {
      if (amount === null || amount === undefined) return '';
      return amount.toLocaleString('vi-VN') + ' VNĐ';
  };

  const triggerEmoji = (player, icon) => {
      const newEmoji = { id: Date.now() + Math.random(), player, icon };
      setEmojis(prev => [...prev, newEmoji]);
      if (icon === '😂' || icon === '😎' || icon === '💩') playSound('laugh');
      else if (icon === '😭' || icon === '😡') playSound('cry');
      setTimeout(() => { setEmojis(prev => prev.filter(e => e.id !== newEmoji.id)); }, 2500);
  };

  const handleSendEmoji = (icon) => {
      triggerEmoji('bottom', icon); 
      setShowEmojiMenu(false);
      if (socket) {
          socket.emit('send_emoji', { roomId, username: currentUser.username, icon });
      }
  };

  const handleSendChat = (text) => {
      if (!text.trim() || !socket) return;
      socket.emit('send_chat', { roomId, username: currentUser.username, text });
      setChatInput('');
      setShowChatMenu(false);
  };

  const toggleMic = async () => {
      if (!isMicOn) {
          if (!localStreamRef.current) {
              try {
                  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                  localStreamRef.current = stream;
                  setIsMicOn(true);
                  Object.values(peersRef.current).forEach(peer => peer.close());
                  peersRef.current = {};
                  setRemoteStreams({});
                  if (socket) socket.emit('mic_ready', { roomId, username: currentUser.username });
              } catch (err) {
                  alert("❌ Lỗi: Không thể truy cập Micro! Vui lòng cấp quyền trong trình duyệt.");
                  console.error(err);
              }
          } else {
              localStreamRef.current.getAudioTracks().forEach(track => track.enabled = true);
              setIsMicOn(true);
          }
      } else {
          if (localStreamRef.current) {
              localStreamRef.current.getAudioTracks().forEach(track => track.enabled = false);
          }
          setIsMicOn(false);
      }
  };

  const handleChop = (attacker, victim, targetCards) => {
      playSound('chat'); 
      let multiplier = 0;
      targetCards.forEach(c => {
          if (c.value === '2') {
              multiplier += (c.suit === 'hearts' || c.suit === 'diamonds') ? 6 : 3;
          }
      });
      if (multiplier === 0) multiplier = 6; 

      let theoreticalChopMoney = multiplier * baseBet;
      const victimBalance = playerMoney[victim]; 
      let actualChopMoney = theoreticalChopMoney;
      if (victimBalance < theoreticalChopMoney) {
          actualChopMoney = victimBalance;
      }

      setPlayerMoney(prev => {
          const newMoney = {
              ...prev,
              [attacker]: prev[attacker] + actualChopMoney,
              [victim]: prev[victim] - actualChopMoney
          };
          if (victim === 'bottom' || attacker === 'bottom') {
              const myNewMoney = newMoney.bottom;
              const sessionUser = JSON.parse(localStorage.getItem('tienlen_user_session')) || currentUser;
              sessionUser.money = myNewMoney;
              localStorage.setItem('tienlen_user_session', JSON.stringify(sessionUser));
              setCurrentUser(sessionUser);

              fetch(`${BACKEND_URL}/api/update-money`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ username: currentUser.username, money: myNewMoney })
              }).catch(err => console.error("Lỗi đồng bộ tiền:", err));
              if (socket) socket.emit('sync_money', { roomId, money: myNewMoney });
          }
          return newMoney;
      });

      setChopEvent({ attacker, victim, money: actualChopMoney });
      setTimeout(() => setChopEvent(null), 2500); 
      setTimeout(() => {
          triggerEmoji(attacker, '⚔️'); 
          triggerEmoji(victim, '😭');   
      }, 600); 
  };

  const handleGameEnd = (winnerKey, serverHands = null, isDutMu = false) => {
      playSound('slide'); 
      if (isDutMu) {
          const winnerName = winnerKey === 'bottom' ? 'BẠN' : getRelativeOpponents()[winnerKey]?.name || 'ĐỐI THỦ';
          showToast(`🔥 KINH HOÀNG: ${winnerName} VỪA ĐÚT MÙ 3 BÍCH! PHẠT X2 TOÀN BÀN!`);
          playSound('bao'); 
      }

      const finalOppHands = serverHands || opponentsHand;
      if (serverHands) {
          setOpponentsHand(serverHands);
      }
      const realOpponents = getRelativeOpponents();
      const myPlayerInfo = roomPlayers.find(p => p.username === currentUser.username);
      const amISpectator = myPlayerInfo ? myPlayerInfo.isWaiting : false;

      const playersInfo = [
          { key: 'bottom', cards: hand, isWaiting: amISpectator },
          { key: 'left', cards: finalOppHands.left, isWaiting: realOpponents.left?.isWaiting },
          { key: 'top', cards: finalOppHands.top, isWaiting: realOpponents.top?.isWaiting },
          { key: 'right', cards: finalOppHands.right, isWaiting: realOpponents.right?.isWaiting }
      ];

      let totalPot = 0;
      let changes = { bottom: null, left: null, top: null, right: null };
      let allThoiHeoIds = []; 

      playersInfo.forEach(p => {
          if (p.key !== winnerKey && !p.isWaiting) {
              let penaltyMoney = p.cards.length === 13 ? 26 * baseBet : p.cards.length * baseBet;
              p.cards.forEach(card => {
                  if (card.value === '2') {
                      penaltyMoney += (card.suit === 'hearts' || card.suit === 'diamonds') ? 6 * baseBet : 3 * baseBet;
                      allThoiHeoIds.push(card.id); 
                  }
              });

              if (isDutMu) penaltyMoney *= 2; 

              const currentBalance = playerMoney[p.key];
              let actualPenalty = penaltyMoney;
              if (currentBalance < penaltyMoney) actualPenalty = currentBalance; 

              totalPot += actualPenalty;
              changes[p.key] = -actualPenalty; 
          }
      });

      changes[winnerKey] = totalPot; 
      setMoneyChanges(changes);
      setThoiHeoCardIds(allThoiHeoIds); 
      setLastWinner(winnerKey);
      setGameState('ended');
      setCurrentTurn(null);
      
      if (winnerKey === 'bottom' && socket && !amISpectator) {
          socket.emit('declare_winner', { roomId, username: currentUser.username });
      }
      
      setTimeout(() => {
          setPlayerMoney(prev => {
              const myMoneyChange = changes.bottom || 0; 
              const myNewMoney = prev.bottom + myMoneyChange; 

              const newMoney = {
                  bottom: myNewMoney,
                  left: prev.left + (changes.left || 0),
                  top: prev.top + (changes.top || 0),
                  right: prev.right + (changes.right || 0)
              };

              if (myMoneyChange !== 0) {
                  const sessionUser = JSON.parse(localStorage.getItem('tienlen_user_session')) || currentUser;
                  sessionUser.money = myNewMoney;
                  localStorage.setItem('tienlen_user_session', JSON.stringify(sessionUser));
                  setCurrentUser(sessionUser);

                  fetch(`${BACKEND_URL}/api/update-money`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ username: currentUser.username, money: myNewMoney })
                  }).catch(err => console.error("Lỗi đồng bộ tiền:", err));
                  if (socket) socket.emit('sync_money', { roomId, money: myNewMoney });
              }

              if (myNewMoney < baseBet && !amISpectator) {
                  setTimeout(() => {
                      playSound('cry'); 
                      setShowBankruptAlert(true); 
                  }, 2500); 
              }
              return newMoney; 
          });
      }, 2000);     
  };

  const handleTrollAction = (toPlayer, type) => {
      const trollId = Date.now();
      setTrolls(prev => [...prev, { id: trollId, from: 'bottom', to: toPlayer, type, phase: 'flying' }]);
      playSound('slide'); 
      
      setTimeout(() => {
          setTrolls(prev => prev.map(t => t.id === trollId ? { ...t, phase: 'hit' } : t));
          playSound('play'); 
      }, 600); 

      setTimeout(() => {
          setTrolls(prev => prev.filter(t => t.id !== trollId));
      }, 2500);

      if (socket) {
          const realOpponents = getRelativeOpponents();
          let targetUsername = null;
          if (toPlayer === 'left' && realOpponents.left) targetUsername = realOpponents.left.username;
          if (toPlayer === 'top' && realOpponents.top) targetUsername = realOpponents.top.username;
          if (toPlayer === 'right' && realOpponents.right) targetUsername = realOpponents.right.username;
          if (targetUsername) {
              socket.emit('send_troll', { roomId, fromUsername: currentUser.username, toUsername: targetUsername, type });
          }
      }
  };

  const autoPlaySmallestCard = () => {
      if (hand.length === 0) return;
      playSound('play'); 
      const cardToPlay = hand[0]; 
      setHand(prev => prev.filter(c => c.id !== cardToPlay.id)); 
      setSelectedCardIds([]); 
      if (socket) socket.emit('play_cards', { roomId, user: currentUser, cards: [cardToPlay] });
  };

  const handlePlayCards = () => {
      if (isClearingRef.current) return;
      if (selectedCardIds.length === 0 || currentTurn !== 'bottom') return; 

      const rawCardsToPlay = hand.filter(card => selectedCardIds.includes(card.id));
      const activeTableCards = tablePlays.length > 0 ? tablePlays[tablePlays.length - 1].cards : [];
      const ruleCheck = canPlayCards(rawCardsToPlay, activeTableCards);
      
      if (!ruleCheck.valid) {   
          playSound('slide'); 
          setIsInvalidPlay(true);
          setTimeout(() => setIsInvalidPlay(false), 400); 
          return; 
      }

      const sortedCardsToPlay = sortCards(rawCardsToPlay);
      setSelectedCardIds([]); 

      if (socket) {
          socket.emit('play_cards', { roomId, user: currentUser, cards: sortedCardsToPlay });
      }
  };  

  const handlePassTurn = () => {
      if (currentTurn !== 'bottom') return;
      if (tablePlays.length === 0) { 
          setIsInvalidPlay(true);
          setTimeout(() => setIsInvalidPlay(false), 400); 
          return;
      }
      playSound('slide');
      setSelectedCardIds([]); 
      if (socket) socket.emit('pass_turn', { roomId, user: currentUser });
  };

  useEffect(() => {
      const noSleep = new NoSleep(); 
      const enableNoSleep = () => {
          noSleep.enable();
          document.removeEventListener('click', enableNoSleep, false);
          document.removeEventListener('touchstart', enableNoSleep, false);
      };
      document.addEventListener('click', enableNoSleep, false);
      document.addEventListener('touchstart', enableNoSleep, false);

      return () => {
          noSleep.disable();
          document.removeEventListener('click', enableNoSleep, false);
          document.removeEventListener('touchstart', enableNoSleep, false);
      };
  }, []);

  useEffect(() => {
      if (gameState !== 'playing' || !currentTurn || timeLeft <= 0) return; 
      const timerId = setInterval(() => setTimeLeft(t => t - 1), 1000);
      return () => clearInterval(timerId); 
  }, [timeLeft, gameState, currentTurn]);

  useEffect(() => {
      const handleBeforeUnload = (e) => {
          if (gameState === 'playing' || gameState === 'dealing') {
              e.preventDefault();
              e.returnValue = ''; 
          }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameState]);

  const startGame = () => {
      if (roomPlayers.length < 2) return showToast("❌ Phải có ít nhất 2 người mới được bắt đầu ván!");
      playSound('slide'); 
      socket.emit('start_game', { roomId }); 
  };

  const handleCardClick = (cardId) => {
      playSound('slide'); 
      setSelectedCardIds((prev) => prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]);
  };

  // ==========================================================
  // PHỤC HỒI HÀM VỊ TRÍ ĐỐI THỦ GỐC CỦA SẾP ĐỂ CỨU MIC WEBRTC
  // ==========================================================
  const getRelativeOpponents = () => {
      const opponents = { left: null, top: null, right: null };
      if (!currentUser || roomPlayers.length <= 1) return opponents;
      
      const otherPlayers = roomPlayers.filter(p => p.username !== currentUser.username);
      
      if (otherPlayers[0]) opponents.right = otherPlayers[0]; 
      if (otherPlayers[1]) opponents.top = otherPlayers[1];   
      if (otherPlayers[2]) opponents.left = otherPlayers[2];  
      
      return opponents;
  };

  const realOpponents = getRelativeOpponents();
  
  useEffect(() => {
      if (roomPlayers.length > 1 && currentUser) {
          setPlayerMoney(prev => {
              const newMoney = { ...prev };
              if (realOpponents.left) newMoney.left = realOpponents.left.money;
              if (realOpponents.top) newMoney.top = realOpponents.top.money;
              if (realOpponents.right) newMoney.right = realOpponents.right.money;
              return newMoney;
          });
      }
  }, [roomPlayers]);

  const isEnded = gameState === 'ended';
  const pStatus = {
      bottom: isEnded && moneyChanges.bottom !== null ? (moneyChanges.bottom > 0 ? 'winner' : 'loser') : null,
      left: isEnded && moneyChanges.left !== null ? (moneyChanges.left > 0 ? 'winner' : 'loser') : null,
      top: isEnded && moneyChanges.top !== null ? (moneyChanges.top > 0 ? 'winner' : 'loser') : null,
      right: isEnded && moneyChanges.right !== null ? (moneyChanges.right > 0 ? 'winner' : 'loser') : null,
  };
  const handleJoinGame = (user, roomId, socketInstance, initialPlayers, roomBaseBet) => {
      const bet = roomBaseBet || 10000;
      
      if (user.money < bet) {
          playSound('bao');
          setShowBrokeModal(true); 
          
          if (socketInstance) {
              socketInstance.emit('leave_room', { user: user, roomId: roomId, penaltyPaid: 0 });
          }
          return; 
      }

      setCurrentUser(user);
      setPlayerMoney(prev => ({ ...prev, bottom: user.money })); 
      setSocket(socketInstance);
      setRoomId(roomId);
      setRoomPlayers(initialPlayers); 
      setBaseBet(bet); 
      setInLobby(false); 
      
      localStorage.setItem('tienlen_saved_room', roomId);
  };

// ==========================================================
  // QUẢN LÝ CÁC SỰ KIỆN GAME VÀ WEBRTC (MIC) CHUNG NHƯ BẢN GỐC
  // ==========================================================
  useEffect(() => {
      if (socket) {
          socket.on('update_players', (playersList) => { setRoomPlayers(playersList); });
          socket.on('player_penalized', (data) => {
              playSound('bao'); 
              setTopAlert(data.message);
              setTimeout(() => setTopAlert(null), 3000); 
          });
          socket.on('reconnect_game', (data) => {
              const { myHand, opponents, currentTurn, tablePlays, passedPlayers,remainingTime } = data;
              playSound('slide');
              setGameState('playing');
              setWinMessage(null);

              setHand(sortCards(myHand));

              const newOppCards = { left: 0, top: 0, right: 0 };
              const realOpponents = getRelativeOpponents();
              opponents.forEach(opp => {
                  if (realOpponents.left?.username === opp.username) newOppCards.left = opp.cardCount;
                  if (realOpponents.top?.username === opp.username) newOppCards.top = opp.cardCount;
                  if (realOpponents.right?.username === opp.username) newOppCards.right = opp.cardCount;
              });
              setOpponentCards(newOppCards);

             if (tablePlays && tablePlays.length > 0) {
                  const mappedPlays = tablePlays.map((play, index) => ({
                      ...play,
                      id: Date.now() + Math.random() + index, 
                      rotation: Math.floor(Math.random() * 30) - 15,
                      offsetX: Math.floor(Math.random() * 50) - 25,
                      offsetY: Math.floor(Math.random() * 50) - 25,
                      cards: play.cards.map(c => ({...c, played: true})) 
                  }));
                  setTablePlays(mappedPlays);
              } else {
                  setTablePlays([]);
              }

              if (passedPlayers) {
                  const mappedPassed = passedPlayers.map(username => {
                      if (username === currentUser.username) return 'bottom';
                      if (realOpponents.left?.username === username) return 'left';
                      if (realOpponents.top?.username === username) return 'top';
                      if (realOpponents.right?.username === username) return 'right';
                      return null;
                  }).filter(Boolean);
                  setPassedPlayers(mappedPassed);
              }

              let activePos = 'bottom';
              if (currentTurn !== currentUser.username) {
                  if (realOpponents.left?.username === currentTurn) activePos = 'left';
                  if (realOpponents.top?.username === currentTurn) activePos = 'top';
                  if (realOpponents.right?.username === currentTurn) activePos = 'right';
              }
              setCurrentTurn(activePos);
              setTimeLeft(remainingTime !== undefined ? remainingTime : 15);
              if (myHand && myHand.length > 0) {
                  setToastMessage("🟢 ĐÃ KHÔI PHỤC TRẬN ĐẤU THÀNH CÔNG!");
              } else {
                  setToastMessage("👀 ĐÃ VÀO PHÒNG XEM TRẬN ĐẤU!");
              }
              setTimeout(() => { setToastMessage(null); }, 3000);
          });

          socket.on('game_started', async (data) => {
              playSound('slide'); 
              setGameState('dealing'); 
              setWinMessage(null); 
              setTablePlays([]);        
              setPassedPlayers([]);     
              setLastPlayedTurn(null);  
              setSelectedCardIds([]);   
              setMoneyChanges({ bottom: null, left: null, top: null, right: null }); 
              setThoiHeoCardIds([]); 

              await delay(2000); 

              const mySortedCards = sortCards(data.myHand);
              setHand(mySortedCards);

              const newOppCards = { left: 0, top: 0, right: 0 };
              const realOpponents = getRelativeOpponents(); 
              data.opponents.forEach(opp => {
                  if (realOpponents.left?.username === opp.username) newOppCards.left = opp.cardCount;
                  if (realOpponents.top?.username === opp.username) newOppCards.top = opp.cardCount;
                  if (realOpponents.right?.username === opp.username) newOppCards.right = opp.cardCount;
              });
              setOpponentCards(newOppCards);

              let activePos = 'bottom';
              if (data.firstTurn !== currentUser.username) {
                  if (realOpponents.left?.username === data.firstTurn) activePos = 'left';
                  if (realOpponents.top?.username === data.firstTurn) activePos = 'top';
                  if (realOpponents.right?.username === data.firstTurn) activePos = 'right';
              }

              const checkMyWin = checkToiTrang(mySortedCards);
              if (checkMyWin) { 
                  setWinMessage({ player: currentUser.name, type: checkMyWin }); 
                  setGameState('waiting'); 
                  return; 
              }

              setGameState('playing');
              setCurrentTurn(activePos);
              setTimeLeft(15);
          });

          socket.on('card_played', (data) => {
              const { playedBy, cards, nextTurn } = data;
              const realOpponents = getRelativeOpponents();
              
              let position = 'bottom';
              if (playedBy !== currentUser.username) {
                  if (realOpponents.left?.username === playedBy) position = 'left';
                  if (realOpponents.top?.username === playedBy) position = 'top';
                  if (realOpponents.right?.username === playedBy) position = 'right';
                  
                  setOpponentCards(prev => ({ ...prev, [position]: prev[position] - cards.length }));
              } else {
                  setHand(prevHand => prevHand.filter(
                      c => !cards.some(playedCard => playedCard.value === c.value && playedCard.suit === c.suit)
                  ));
              }

              setTablePlays(prev => {
                  if (prev.length > 0) {
                      const lastPlay = prev[prev.length - 1]; 
                      const lastCards = lastPlay.cards;
                      
                      const hasHeo = lastCards.some(c => c.value === '2');
                      const isTargetHang = lastCards.length >= 4; 
                      const isWeaponHang = cards.length >= 4; 

                      if ((hasHeo && isWeaponHang) || (isTargetHang && isWeaponHang)) {
                          setTimeout(() => {
                              handleChop(position, lastPlay.player, lastCards);
                          }, 0);
                      }
                  }

                  playSound('play'); 
                  const newPlayId = Date.now() + Math.random();
                  const newPlay = {
                      id: newPlayId,
                      cards: cards.map(c => ({...c, played: true})),
                      player: position,
                      rotation: Math.floor(Math.random() * 30) - 15,
                      offsetX: Math.floor(Math.random() * 50) - 25,
                      offsetY: Math.floor(Math.random() * 50) - 25
                  };
                  return [...prev, newPlay];
              });

              let nextPos = 'bottom';
              if (nextTurn !== currentUser.username) {
                  if (realOpponents.left?.username === nextTurn) nextPos = 'left';
                  if (realOpponents.top?.username === nextTurn) nextPos = 'top';
                  if (realOpponents.right?.username === nextTurn) nextPos = 'right';
              }
              setCurrentTurn(nextPos);
              setTimeLeft(15);
          });

          socket.on('turn_passed', (data) => {
              const { passedBy, nextTurn, isRoundClear, serverPassedPlayers } = data;
              playSound('slide');

              const realOpponents = getRelativeOpponents();
              const mappedPassedPlayers = serverPassedPlayers.map(username => {
                  if (username === currentUser.username) return 'bottom';
                  if (realOpponents.left?.username === username) return 'left';
                  if (realOpponents.top?.username === username) return 'top';
                  if (realOpponents.right?.username === username) return 'right';
                  return null;
              }).filter(Boolean);
              
              setPassedPlayers(mappedPassedPlayers);

              if (isRoundClear) {
                  isClearingRef.current = true; 
                  setTimeout(() => {
                      setTablePlays([]);
                      setPassedPlayers([]);
                      isClearingRef.current = false; 
                  }, 1200); 
              }

              let nextPos = 'bottom';
              if (nextTurn !== currentUser.username) {
                  if (realOpponents.left?.username === nextTurn) nextPos = 'left';
                  if (realOpponents.top?.username === nextTurn) nextPos = 'top';
                  if (realOpponents.right?.username === nextTurn) nextPos = 'right';
              }
              setCurrentTurn(nextPos);
              setTimeLeft(15);
          });

          socket.on('game_ended', (data) => {
              const { winner, remainingHands, isDutMu } = data;
              const realOpponents = getRelativeOpponents();
              let winnerPos = 'bottom';
              if (winner === realOpponents.left?.username) winnerPos = 'left';
              if (winner === realOpponents.top?.username) winnerPos = 'top';
              if (winner === realOpponents.right?.username) winnerPos = 'right';

              let finalOppHands = { left: [], top: [], right: [] };
              if (remainingHands) {
                  if (realOpponents.left) finalOppHands.left = remainingHands[realOpponents.left.username] || [];
                  if (realOpponents.top) finalOppHands.top = remainingHands[realOpponents.top.username] || [];
                  if (realOpponents.right) finalOppHands.right = remainingHands[realOpponents.right.username] || [];
              }
              handleGameEnd(winnerPos, finalOppHands, isDutMu);
          });

          socket.on('opponent_fled', (data) => {
              const { winner, quitter, reward } = data;
              
              if (quitter === currentUser?.username) return;

              playSound('slide'); 
              const realOpponents = getRelativeOpponents();
              
              let winnerPos = null; 
              if (winner === currentUser.username) {
                  winnerPos = 'bottom';
              } else {
                  if (realOpponents.left?.username === winner) winnerPos = 'left';
                  if (realOpponents.top?.username === winner) winnerPos = 'top';
                  if (realOpponents.right?.username === winner) winnerPos = 'right';
              }

              let quitterPos = null; 
              if (quitter !== currentUser.username) {
                  if (realOpponents.left?.username === quitter) quitterPos = 'left';
                  if (realOpponents.top?.username === quitter) quitterPos = 'top';
                  if (realOpponents.right?.username === quitter) quitterPos = 'right';
              }

              if (!winnerPos) return;

              const changes = { bottom: null, left: null, top: null, right: null };
              changes[winnerPos] = reward; 
              if (quitterPos) changes[quitterPos] = -reward; 
              
              setMoneyChanges(changes);
              setLastWinner(winnerPos);
              setGameState('ended');
              setCurrentTurn(null);

              if (winnerPos === 'bottom') {
                  setTimeout(() => {
                      setPlayerMoney(prev => {
                          const myNewMoney = prev.bottom + reward;
                          
                          fetch(`${BACKEND_URL}/api/update-money`, { 
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ username: currentUser.username, money: myNewMoney })
                          }).catch(err => console.error("Lỗi đồng bộ tiền:", err));

                          if (socket) socket.emit('sync_money', { roomId, money: myNewMoney });

                          const sessionUser = JSON.parse(localStorage.getItem('tienlen_user_session')) || currentUser;
                          sessionUser.money = myNewMoney;
                          localStorage.setItem('tienlen_user_session', JSON.stringify(sessionUser));
                          setCurrentUser(sessionUser);

                          return { ...prev, bottom: myNewMoney };
                      });
                  }, 2000);
              }
          });

          socket.on('receive_troll', (data) => {
              const { fromUsername, toUsername, type } = data;
              const realOpponents = getRelativeOpponents();
              let fromPos = null;
              if (fromUsername === currentUser.username) return; 
              if (realOpponents.left?.username === fromUsername) fromPos = 'left';
              if (realOpponents.top?.username === fromUsername) fromPos = 'top';
              if (realOpponents.right?.username === fromUsername) fromPos = 'right';

              let toPos = null;
              if (toUsername === currentUser.username) toPos = 'bottom'; 
              if (realOpponents.left?.username === toUsername) toPos = 'left';
              if (realOpponents.top?.username === toUsername) toPos = 'top';
              if (realOpponents.right?.username === toUsername) toPos = 'right';

              if (fromPos && toPos) {
                  const trollId = Date.now() + Math.random();
                  setTrolls(prev => [...prev, { id: trollId, from: fromPos, to: toPos, type, phase: 'flying' }]);
                  playSound('slide'); 
                  setTimeout(() => {
                      setTrolls(prev => prev.map(t => t.id === trollId ? { ...t, phase: 'hit' } : t));
                      playSound('play'); 
                  }, 600);
                  setTimeout(() => {
                      setTrolls(prev => prev.filter(t => t.id !== trollId));
                  }, 2500);
              }
          });

          socket.on('sync_spectator', (data) => {
              setGameState(data.gameState); 
              if (data.tablePlays && data.tablePlays.length > 0) {
                  const realOpponents = getRelativeOpponents();
                  const mappedPlays = data.tablePlays.map(play => {
                      let pos = 'bottom';
                      if (play.playedBy !== currentUser.username) {
                          if (realOpponents.left?.username === play.playedBy) pos = 'left';
                          if (realOpponents.top?.username === play.playedBy) pos = 'top';
                          if (realOpponents.right?.username === play.playedBy) pos = 'right';
                      }
                      return { player: pos, cards: play.cards };
                  });
                  setTablePlays(mappedPlays); 
              }
          });

          socket.on('receive_chat', (data) => {
              const { username, text } = data;
              const realOpponents = getRelativeOpponents();
              let pos = 'bottom';
              if (username !== currentUser.username) {
                  if (realOpponents.left?.username === username) pos = 'left';
                  if (realOpponents.top?.username === username) pos = 'top';
                  if (realOpponents.right?.username === username) pos = 'right';
              }
              const chatId = Date.now() + Math.random();
              setActiveChats(prev => [...prev, { id: chatId, player: pos, text }]);
              playSound('slide'); 
              setTimeout(() => { setActiveChats(prev => prev.filter(c => c.id !== chatId)); }, 3500);
          });

          socket.on('receive_emoji', (data) => {
              const { username, icon } = data;
              const realOpponents = getRelativeOpponents();
              let pos = 'bottom'; 
              if (username !== currentUser.username) {
                  if (realOpponents.left?.username === username) pos = 'left';
                  if (realOpponents.top?.username === username) pos = 'top';
                  if (realOpponents.right?.username === username) pos = 'right';
              }
              triggerEmoji(pos, icon); 
          });

          socket.on('play_error', (data) => {
              showToast(`⚠️ ${data.message}`);
              playSound('slide'); 
              setIsInvalidPlay(true);
              setTimeout(() => setIsInvalidPlay(false), 400); 
          });

          // 🔥 PHỤC HỒI CODE MIC NẰM CHUNG Ở ĐÂY NHƯ BẢN GỐC 🔥
         
      } 
      
      return () => {
          if (socket) {
              socket.off('update_players'); 
              socket.off('game_started'); 
              socket.off('card_played');
              socket.off('turn_passed'); 
              socket.off('game_ended'); 
              socket.off('opponent_fled'); 
              socket.off('receive_chat'); 
              socket.off('receive_emoji'); 
              socket.off('reconnect_game');
              socket.off('receive_troll');       
              socket.off('player_penalized');    
              socket.off('play_error');          
              
          }
      };
  }, [socket, currentUser, roomPlayers, hand, opponentsHand]);
  // 🟢 TỐI ƯU 2: CÁCH LY WEBRTC KHỎI LOGIC GAME ĐỂ KHÔNG RỚT MẠNG LÚC ĐÁNH BÀI
// 🟢 TỐI ƯU WEBRTC: RADAR QUÉT LỖI ĐƯỜNG TRUYỀN ICE
useEffect(() => {
    if (!socket) return;

    socket.on('peer_mic_ready', async (data) => {
        const { socketId } = data;
        if (peersRef.current[socketId]) peersRef.current[socketId].close();
        const peer = new RTCPeerConnection(rtcConfig);
        peersRef.current[socketId] = peer;
        iceQueuesRef.current[socketId] = []; 
        
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => { peer.addTrack(track, localStreamRef.current); });
        } else {
            peer.addTransceiver('audio', { direction: 'recvonly' });
        }
        
        peer.ontrack = (event) => { 
            console.log("🎧 Nhận được track âm thanh từ đối thủ (peer_mic_ready)!");
            const incomingStream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
            setRemoteStreams(prev => ({ ...prev, [socketId]: incomingStream })); 
        };

        // BẮT MẠCH ICE STATE
        peer.oniceconnectionstatechange = () => {
            console.log(`📡 [Máy Gửi Offer] Tình trạng mạng WebRTC đổi thành: %c${peer.iceConnectionState}`, "color: #ff9f43; font-weight: bold; font-size: 14px;");
        };

        // MÁY QUÉT GENERATE CANDIDATE
        peer.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("📤 Đang gửi đi 1 gói ICE Candidate dò đường...");
                socket.emit('webrtc_signal', { toSocketId: socketId, signal: { type: 'candidate', candidate: event.candidate } });
            } else {
                console.log("🏁 Đã dò xong toàn bộ đường truyền ICE (Gửi Offer).");
            }
        };

        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        console.log("📜 Đã tạo và gửi OFFER sang máy kia.");
        socket.emit('webrtc_signal', { toSocketId: socketId, signal: offer });
    });

    socket.on('webrtc_signal', async (data) => {
        const { fromSocketId, signal } = data;
        let peer = peersRef.current[fromSocketId];
        
        if (!peer) {
            peer = new RTCPeerConnection(rtcConfig);
            peersRef.current[fromSocketId] = peer;
            iceQueuesRef.current[fromSocketId] = []; 
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => peer.addTrack(track, localStreamRef.current));
            } else {
                peer.addTransceiver('audio', { direction: 'recvonly' });
            }
            
            peer.ontrack = (event) => { 
                console.log("🎧 Nhận được track âm thanh từ đối thủ (webrtc_signal)!");
                const incomingStream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
                setRemoteStreams(prev => ({ ...prev, [fromSocketId]: incomingStream })); 
            };

            // BẮT MẠCH ICE STATE
            peer.oniceconnectionstatechange = () => {
                 console.log(`📡 [Máy Nhận Offer] Tình trạng mạng WebRTC đổi thành: %c${peer.iceConnectionState}`, "color: #2ecc71; font-weight: bold; font-size: 14px;");
            };

            // MÁY QUÉT GENERATE CANDIDATE
            peer.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log("📤 Đang gửi đi 1 gói ICE Candidate dò đường...");
                    socket.emit('webrtc_signal', { toSocketId: fromSocketId, signal: { type: 'candidate', candidate: event.candidate } });
                } else {
                    console.log("🏁 Đã dò xong toàn bộ đường truyền ICE (Gửi Answer).");
                }
            };
        }

        try {
            if (signal.type === 'offer') {
                if (peer.signalingState !== 'stable') return;
                console.log("📥 Nhận được OFFER, chuẩn bị trả lời...");
                await peer.setRemoteDescription(new RTCSessionDescription(signal));
                if (iceQueuesRef.current[fromSocketId]) {
                    iceQueuesRef.current[fromSocketId].forEach(c => peer.addIceCandidate(c).catch(e=>console.error(e)));
                    iceQueuesRef.current[fromSocketId] = [];
                }
                const answer = await peer.createAnswer();
                await peer.setLocalDescription(answer);
                console.log("📜 Đã gửi ANSWER trả lời.");
                socket.emit('webrtc_signal', { toSocketId: fromSocketId, signal: answer });
                
            } else if (signal.type === 'answer') {
                if (peer.signalingState !== 'have-local-offer') return;
                console.log("📥 Nhận được ANSWER chốt đơn!");
                await peer.setRemoteDescription(new RTCSessionDescription(signal));
                if (iceQueuesRef.current[fromSocketId]) {
                    iceQueuesRef.current[fromSocketId].forEach(c => peer.addIceCandidate(c).catch(e=>console.error(e)));
                    iceQueuesRef.current[fromSocketId] = [];
                }
                
            } else if (signal.type === 'candidate') {
                // 🛑 MÁY QUÉT BẮT GÓI TIN ĐẾN
                console.log("📦 ĐÃ NHẬN ĐƯỢC 1 gói ICE Candidate từ đối thủ!");
                const candidate = new RTCIceCandidate(signal.candidate);
                if (peer.remoteDescription && peer.remoteDescription.type) {
                    await peer.addIceCandidate(candidate).catch(e => console.error("Lỗi add ICE:", e));
                } else {
                    if (!iceQueuesRef.current[fromSocketId]) iceQueuesRef.current[fromSocketId] = [];
                    iceQueuesRef.current[fromSocketId].push(candidate);
                }
            }
        } catch (error) {
            console.error("🔥 Lỗi WebRTC Signaling:", error);
        }
    });

    socket.on('peer_mic_stopped', (data) => {
        // ... (Giữ nguyên như cũ) ...
        const { socketId } = data;
        if (peersRef.current[socketId]) {
            peersRef.current[socketId].close();
            delete peersRef.current[socketId];
            setRemoteStreams(prev => {
                const newStreams = { ...prev };
                delete newStreams[socketId];
                return newStreams;
            });
        }
    });

    return () => {
        socket.off('peer_mic_ready');
        socket.off('webrtc_signal');
        socket.off('peer_mic_stopped');
    };
}, [socket]);
  const executeLeaveTable = async (isPenalized) => {
      let penaltyPaid = 0; 
      if (isPenalized) {
          const theoreticalPenalty = 26 * baseBet; 
          const currentMoney = playerMoney.bottom;
          penaltyPaid = currentMoney < theoreticalPenalty ? currentMoney : theoreticalPenalty;
          const myNewMoney = currentMoney - penaltyPaid;
          try {
              await fetch(`${BACKEND_URL}/api/update-money`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ username: currentUser.username, money: myNewMoney })
              });
          } catch (err) { console.error("Lỗi đồng bộ tiền:", err);
            if (socket) socket.emit('sync_money', { roomId, money: myNewMoney });
           }

          const sessionUser = JSON.parse(localStorage.getItem('tienlen_user_session')) || currentUser;
          sessionUser.money = myNewMoney;
          localStorage.setItem('tienlen_user_session', JSON.stringify(sessionUser));
          setCurrentUser(sessionUser);
      }

      if (socket) socket.emit('leave_room', { user: currentUser, roomId, penaltyPaid });
      
      localStorage.removeItem('tienlen_saved_room'); 

      setRoomPlayers([]); setRoomId(''); setGameState('waiting'); setTablePlays([]);
      setHand([]); setCurrentTurn(null); setMoneyChanges({ bottom: null, left: null, top: null, right: null });
      setWinMessage(null); setOpponentsHand({ left: [], top: [], right: [] }); setOpponentCards({ left: 0, top: 0, right: 0 });
      setThoiHeoCardIds([]); setShowLeaveWarning(false); setShowBankruptAlert(false);
      setInLobby(true); 
  };

  const handleLeaveClick = () => {
      const myPlayerInfo = roomPlayers.find(p => p.username === currentUser.username);
      const amISpectator = myPlayerInfo ? myPlayerInfo.isWaiting : false;

      if ((gameState === 'playing' || gameState === 'dealing') && !amISpectator) {
          playSound('slide');
          setShowLeaveWarning(true); 
      } else {
          executeLeaveTable(false); 
      }
  };

  const getHitData = (pos) => {
      const hit = trolls.find(t => t.to === pos && t.phase === 'hit');
      return hit ? { activeHit: hit.type, hitId: hit.id } : { activeHit: null, hitId: null };
  };

  const leftHit = getHitData('left');
  const topHit = getHitData('top');
  const rightHit = getHitData('right');
  const bottomHit = getHitData('bottom'); 
  const myPlayerInfo = roomPlayers.find(p => p.username === currentUser?.username);
  const isSpectator = myPlayerInfo ? myPlayerInfo.isWaiting : false;

  // 🟢 CÀI ĐẶT BÀN CHƠI CHỐNG LAG
// ==========================================================
  // 🟢 TỐI ƯU 2: Đóng băng khu vực bài đánh ra giữa bàn
  // Chỉ vẽ lại lá bài khi có người đánh, KHÔNG lag máy khi đồng hồ đếm
  // ==========================================================
  const memoizedCenterBoard = React.useMemo(() => {
      if (winMessage) {
          return (
              <div className="toi-trang-celebration">
                  <h1 className="toi-trang-text-center">TỚI TRẮNG</h1>
                  <div style={{color: '#fff', fontSize: '22px', fontWeight: 'bold', marginBottom: '25px', textShadow: '0 2px 5px #000', textTransform: 'uppercase'}}>
                      {winMessage.player} CÓ {winMessage.type}
                  </div>
                  <div className="toi-trang-heos">
                      <div className="heo-card"><Card suit="spades" value="2" isSelected={false} onClick={() => {}} /></div>
                      <div className="heo-card"><Card suit="clubs" value="2" isSelected={false} onClick={() => {}} /></div>
                      <div className="heo-card"><Card suit="diamonds" value="2" isSelected={false} onClick={() => {}} /></div>
                      <div className="heo-card"><Card suit="hearts" value="2" isSelected={false} onClick={() => {}} /></div>
                  </div>
              </div>
          );
      }

      const visiblePlays = tablePlays.length > 4 ? tablePlays.slice(tablePlays.length - 4) : tablePlays;
      const currentOpponents = getRelativeOpponents(); // Kéo vị trí đối thủ ngay tại đây

      return visiblePlays.map((play, index) => {
          const isLatest = play.id === tablePlays[tablePlays.length - 1].id;
          
          let pos = 'bottom';
          if (play.playedBy !== currentUser?.username) {
              if (currentOpponents.left?.username === play.playedBy) pos = 'left';
              if (currentOpponents.top?.username === play.playedBy) pos = 'top';
              if (currentOpponents.right?.username === play.playedBy) pos = 'right';
          }

          return (
              <div key={play.id} className={`play-batch ${isLatest ? 'latest' : 'old'}`} style={{ transform: `translate(${play.offsetX}px, ${play.offsetY}px) rotate(${play.rotation}deg) ${isLatest ? 'scale(1.05)' : 'scale(0.9)'}`, zIndex: index }}>
                  {play.cards.map((card) => (
                      <div key={card.id} className={`flying-card from-${play.player || pos} ${card.played ? 'played' : ''}`}>
                          <Card suit={card.suit} value={card.value} isSelected={false} onClick={() => {}} />
                      </div>
                  ))}
              </div>
          )
      });
  }, [winMessage, tablePlays, currentUser?.username, roomPlayers]); // Ép phụ thuộc roomPlayers để không bao giờ lỗi
  return (
    <>
        <audio 
            ref={globalAudioRef}
            src={playlist[currentSongIndex]?.src}
            onEnded={handleSongEnd}
            autoPlay
        />

        {inLobby ? (
            <>
                <AuthLobby 
                    onJoinGame={handleJoinGame} 
                    bgmVolume={bgmVolume} setBgmVolume={setBgmVolume}
                    sfxVolume={sfxVolume} setSfxVolume={setSfxVolume}
                    playlist={playlist} currentSongIndex={currentSongIndex}
                />
                
                {showBrokeModal && (
                    <div className="broke-modal-overlay">
                        <div className="broke-modal-content">
                            <div className="broke-icon">💸</div>
                            <h2 className="broke-title">TÀI KHOẢN CẠN KIỆT!</h2>
                            <p className="broke-text">Bạn không đủ tiền để vào sàn đấu này (Cần tối thiểu {formatMoney(10000)}).</p>
                            <p className="broke-text">Vui lòng nạp thêm tiền hoặc nhận cứu trợ để tiếp tục!</p>
                            
                            <div className="broke-buttons">
                                <button className="broke-btn-close" onClick={() => setShowBrokeModal(false)}>
                                    ĐÓNG
                                </button>
                                <button className="broke-btn-deposit" onClick={() => {
                                    alert("Tính năng Nạp Tiền đang phát triển!");
                                    setShowBrokeModal(false);
                                }}>
                                    NẠP TIỀN NGAY
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        ) : (
            <div className="casino-room">
                <div className="top-left-controls" style={{ position: 'absolute', top: '15px', left: '15px', zIndex: 100, display: 'flex', gap: '10px' }}>
                    <button className="btn-leave-table" onClick={handleLeaveClick} style={{ position: 'static' }}>
                          🔙 RỜI BÀN
                    </button>
                    <button className="btn-settings-toggle" onClick={() => setShowSettings(!showSettings)}>
                          ⚙️ CÀI ĐẶT
                    </button>
                </div>

                {showSettings && (
                    <div className="in-game-settings-panel">
                        <h3>CÀI ĐẶT GAME</h3>
                        <div className="setting-slider-row">
                            <span className="lbl">🎵 Nhạc:</span>
                            <input type="range" min="0" max="100" value={bgmVolume} onChange={(e) => {
                                setBgmVolume(e.target.value);
                                localStorage.setItem('tienlen_bgm_volume', e.target.value);
                            }} />
                            <span className="val">{bgmVolume}%</span>
                        </div>
                        <div className="setting-slider-row">
                            <span className="lbl">🔊 SFX:</span>
                            <input type="range" min="0" max="100" value={sfxVolume} onChange={(e) => {
                                setSfxVolume(e.target.value);
                                localStorage.setItem('tienlen_sfx_volume', e.target.value);
                            }} />
                            <span className="val">{sfxVolume}%</span>
                        </div>
                        <button className="btn-close-settings" onClick={() => setShowSettings(false)}>Đóng</button>
                    </div>
                )}

                {topAlert && (
                    <div className="top-penalty-banner">
                        {topAlert}
                    </div>
                )}
                {toastMessage && (
                    <div className="custom-toast-notification">
                        {toastMessage}
                    </div>
                )}
                <div className="room-id-display" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '8px 20px', background: 'rgba(0,0,0,0.7)', border: '2px solid #f1c40f', borderRadius: '30px', color: '#fff', fontWeight: 'bold', fontSize: '18px', textTransform: 'uppercase', boxShadow: '0 4px 10px rgba(0,0,0,0.5)', width: 'fit-content' }}>
                    <div>PHÒNG: <span style={{ color: '#6eff4a', textShadow: '0 0 8px rgba(110, 255, 74, 0.6)' }}>{roomId === 'main' ? 'SẢNH CHÍNH' : roomId}</span></div>
                    <div style={{ width: '2px', height: '20px', background: 'rgba(255,255,255,0.3)' }}></div>
                    <div>CƯỢC: <span style={{ color: '#6eff4a', textShadow: '0 0 8px rgba(110, 255, 74, 0.6)' }}>{formatMoney(baseBet)}</span></div>
                </div>
                <div className={`game-table ${trolls.some(t => t.type === 'nuclear' && t.phase === 'hit') ? 'nuclear-screen-shake' : ''}`}>
                  <div className="table-center-logo"><h2>TIẾN LÊN</h2></div>
                  <div style={{ color: 'red', zIndex: 9999 }}>
    Mic đang kết nối: {Object.keys(remoteStreams).length}
</div>
                  {Object.entries(remoteStreams).map(([socketId, stream]) => (
                      <AudioPlayer key={socketId} stream={stream} />
                  ))}
                  {activeChats.map(chat => {
                      const posMap = {
                          bottom: { left: '15%', top: '60%' }, 
                          left:   { left: '10%', top: '25%' },
                          top:    { left: '50%', top: '5%' },
                          right:  { left: '90%', top: '25%' }
                      };
                      const pos = posMap[chat.player];
                      return (
                          <div key={chat.id} className="chat-bubble" style={{ position: 'absolute', left: pos.left, top: pos.top, transform: 'translateX(-50%)', background: '#fff', color: '#000', padding: '8px 12px', borderRadius: '15px', fontWeight: 'bold', zIndex: 200, boxShadow: '0 4px 8px rgba(0,0,0,0.3)', maxWidth: '200px', wordWrap: 'break-word', textAlign: 'center' }}>
                              {chat.text}
                              <div style={{ position: 'absolute', bottom: '-8px', left: '50%', transform: 'translateX(-50%)', borderWidth: '8px 8px 0', borderStyle: 'solid', borderColor: '#fff transparent transparent transparent' }}></div>
                          </div>
                      );
                  })}
                  {isSpectator && gameState === 'playing' && (
                      <div style={{ position: 'absolute', top: '25%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'rgba(0,0,0,0.8)', color: '#ffd700', padding: '10px 25px', borderRadius: '30px', zIndex: 100, fontWeight: 'bold', fontSize: '18px', border: '2px solid #ffd700', boxShadow: '0 0 15px rgba(255, 215, 0, 0.5)' }}>
                          👀 VÁN ĐẤU ĐANG DIỄN RA - BẠN ĐANG XEM
                      </div>
                  )}
                  {chopEvent && (
                      <div className="chop-overlay-effect">
                          <div className="chop-flash"></div>
                          <h1 className="chop-text">CHẶT!!</h1>
                          <div className="chop-money-transfer">
                              {chopEvent.attacker === 'bottom' ? 'BẠN' : chopEvent.attacker.toUpperCase()} vừa lụm của {chopEvent.victim === 'bottom' ? 'BẠN' : chopEvent.victim.toUpperCase()} <br/>
                              <span className="stolen-money">+{formatMoney(chopEvent.money)}</span>
                          </div>
                      </div>
                  )}
                  
                  {(gameState === 'waiting' || gameState === 'ended') && !winMessage && !isSpectator && (
                      <button 
                          className="btn btn-orange" 
                          style={{ position: 'absolute', top: '55%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 100, fontSize: '24px', padding: '15px 40px' }} 
                          onClick={startGame}
                      >
                          {gameState === 'ended' ? 'CHƠI VÁN MỚI' : 'BẮT ĐẦU BÀN'}
                      </button>
                  )}

                  {gameState === 'dealing' && (
                      <div className="dealing-animation-container">
                          <div className="deck-center"></div>
                          <div className="flying-deal-card to-bottom"></div>
                          <div className="flying-deal-card to-left"></div>
                          <div className="flying-deal-card to-top"></div>
                          <div className="flying-deal-card to-right"></div>
                      </div>
                  )}

                  {trolls.filter(t => t.phase === 'flying').map(troll => (
                      <FlyingTroll key={troll.id} troll={troll} />
                  ))}
                  {emojis.map(e => (
                      <FloatingEmoji key={e.id} data={e} />
                  ))}

                  <div className="center-board">
                      {memoizedCenterBoard}
                  </div>

                  {realOpponents.left && (
                      <Opponent 
                          playerKey="left" name={realOpponents.left.name} avatar={realOpponents.left.avatar} 
                          cardCount={realOpponents.left.isWaiting ? 0 : opponentCards.left} position="left-side" 
                          isActive={currentTurn === 'left'} timeLeft={timeLeft} hasPassed={passedPlayers.includes('left')}
                          onTroll={handleTrollAction} isWaiting={realOpponents.left.isWaiting}
                          activeHit={leftHit.activeHit} hitId={leftHit.hitId}
                          money={formatMoney(playerMoney.left)} moneyChange={moneyChanges.left} 
                          endStatus={pStatus.left} revealedCards={(isEnded || winMessage) && !realOpponents.left.isWaiting ? opponentsHand.left : null}
                          thoiHeoCardIds={thoiHeoCardIds} 
                          isDisconnected={realOpponents.left.isDisconnected}
                      /> 
                  )}
                            
                  {realOpponents.top && (
                      <Opponent 
                          playerKey="top" name={realOpponents.top.name} avatar={realOpponents.top.avatar}
                          cardCount={realOpponents.top.isWaiting ? 0 : opponentCards.top} position="top" 
                          isActive={currentTurn === 'top'} timeLeft={timeLeft} hasPassed={passedPlayers.includes('top')}
                          onTroll={handleTrollAction} isWaiting={realOpponents.top.isWaiting}
                          activeHit={topHit.activeHit} hitId={topHit.hitId}
                          money={formatMoney(playerMoney.top)} moneyChange={moneyChanges.top} 
                          endStatus={pStatus.top} revealedCards={(isEnded || winMessage) && !realOpponents.top.isWaiting ? opponentsHand.top : null}
                          thoiHeoCardIds={thoiHeoCardIds} 
                          isDisconnected={realOpponents.top.isDisconnected}
                      />
                  )}
                            
                  {realOpponents.right && (
                      <Opponent 
                          playerKey="right" name={realOpponents.right.name} avatar={realOpponents.right.avatar}
                          cardCount={realOpponents.right.isWaiting ? 0 : opponentCards.right} position="right-side" 
                          isActive={currentTurn === 'right'} timeLeft={timeLeft} hasPassed={passedPlayers.includes('right')}
                          onTroll={handleTrollAction} isWaiting={realOpponents.right.isWaiting}
                          activeHit={rightHit.activeHit} hitId={rightHit.hitId}
                          money={formatMoney(playerMoney.right)} moneyChange={moneyChanges.right} 
                          endStatus={pStatus.right} revealedCards={(isEnded || winMessage) && !realOpponents.right.isWaiting ? opponentsHand.right : null}
                          thoiHeoCardIds={thoiHeoCardIds} 
                          isDisconnected={realOpponents.right.isDisconnected}
                      />
                  )}
                  
                  <div className={`player-info bottom-left ${passedPlayers.includes('bottom') ? 'passed' : ''}`}>
                      <div className={`avatar-circle ${currentTurn === 'bottom' ? 'active-turn' : ''} ${pStatus.bottom || ''}`} style={{ position: 'relative'}}>
                        {isSpectator && (
                              <div style={{ position: 'absolute', bottom: '-10px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#555', color: '#fff', fontSize: '12px', fontWeight: 'bold', padding: '2px 10px', borderRadius: '10px', border: '1px solid #fff', zIndex: 50 }}>
                                  ĐANG XEM
                              </div>
                          )}
                          <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', position: 'absolute', top: 0, left: 0, zIndex: 0 }}>
                              {currentUser && currentUser.avatar && (
                                  <img src={currentUser.avatar} alt="My Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              )}
                          </div>
                          
                          <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%', pointerEvents: 'none' }}>
                              {pStatus.bottom === 'winner' && <div className="winner-badge">WINNER</div>}
                              {pStatus.bottom === 'loser' && <div className="loser-badge">LOSER</div>}
                              {currentTurn === 'bottom' && <div className="turn-timer-badge">{timeLeft}</div>}
                              {passedPlayers.includes('bottom') && <div className="opp-passed-badge" style={{borderRadius: 50}}>BỎ QUA</div>}
                          </div>
                          
                          {moneyChanges.bottom !== null && (
                              <div className={`floating-money ${moneyChanges.bottom > 0 ? 'win' : 'lose'}`} style={{zIndex: 20}}>
                                  {moneyChanges.bottom > 0 ? `+${formatMoney(moneyChanges.bottom)}` : formatMoney(moneyChanges.bottom)}
                              </div>
                          )}

                          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 30 }}>
                              {bottomHit?.activeHit === 'tomato' && <div key={bottomHit.hitId} className="troll-effect tomato-splat" style={{ backgroundImage: `url('${trollGifPaths.tomato}')` }}></div>}
                              {bottomHit?.activeHit === 'bomb' && <div key={bottomHit.hitId} className="troll-effect explosion" style={{ backgroundImage: `url('${trollGifPaths.bomb}')` }}></div>}
                              {bottomHit?.activeHit === 'fire' && <div key={bottomHit.hitId} className="troll-effect burning" style={{ backgroundImage: `url('${trollGifPaths.fire}')` }}></div>}
                              {bottomHit?.activeHit === 'hit' && <div key={bottomHit.hitId} className="troll-effect punch" style={{ backgroundImage: `url('${trollGifPaths.hit}')` }}></div>}
                              {bottomHit?.activeHit === 'slap' && <div key={bottomHit.hitId} className="troll-effect slap-meme" style={{ backgroundImage: `url('${trollGifPaths.slap}')` }}></div>}
                              {bottomHit?.activeHit === 'slap2' && <div key={bottomHit.hitId} className="troll-effect slap2-meme" style={{ backgroundImage: `url('${trollGifPaths.slap2}')` }}></div>}
                              {bottomHit?.activeHit === 'nuclear' && <div key={bottomHit.hitId} className="troll-effect nuclear" style={{ backgroundImage: `url('${trollGifPaths.nuclear}')` }}></div>}
                          </div>
                      </div>
                      
                      <div className="player-name">{currentUser ? currentUser.name : 'Người chơi'}</div>
                      <div className="player-money">{formatMoney(playerMoney.bottom)}</div>
                  </div>

                  {gameState === 'playing' && !isSpectator && (
                      <div className="left-interaction-panel" style={{ position: 'absolute', bottom: '5%', left: '-5%', zIndex: 100 }}>
                          <button onClick={() => { setShowEmojiMenu(!showEmojiMenu); setShowChatMenu(false); }} style={{ width: '65px', height: '65px', borderRadius: '50%', fontSize: '32px', backgroundColor: 'rgba(0,0,0,0.6)', border: '2px solid #fff', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              😀
                          </button>
                          {showEmojiMenu && (
                              <div style={{ position: 'absolute', bottom: '80px', left: '0', background: 'rgba(0,0,0,0.85)', padding: '15px', borderRadius: '20px', display: 'flex', gap: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.6)', width: 'max-content', border: '1px solid #555' }}>
                                  {['😂', '😭', '😡', '😎', '😍', '💩'].map(icon => (
                                      <div key={icon} onClick={() => handleSendEmoji(icon)} style={{ fontSize: '36px', cursor: 'pointer', transition: 'transform 0.1s' }} onMouseDown={e => e.currentTarget.style.transform = 'scale(0.8)'} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
                                          {icon}
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  )}

                  {gameState === 'playing' && (
                      <div className="right-interaction-panel" style={{ position: 'absolute', bottom: '30px', right: '30px', zIndex: 100, display: 'flex', gap: '20px' }}>
                          <div style={{ position: 'relative' }}>
                              <button onClick={() => { setShowChatMenu(!showChatMenu); setShowEmojiMenu(false); }} style={{ width: '65px', height: '65px', borderRadius: '50%', fontSize: '30px', backgroundColor: 'rgba(0,0,0,0.6)', border: '2px solid #fff', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  💬
                              </button>
                              {showChatMenu && (
                                  <div style={{ position: 'absolute', bottom: '80px', right: '0', background: 'rgba(0,0,0,0.9)', padding: '20px', borderRadius: '20px', width: '350px', border: '1px solid #666', boxShadow: '0 5px 25px rgba(0,0,0,0.7)' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                                          {['Đánh nhanh lên bạn ơi!', 'Bài xấu vãi chưởng!', 'Heo nè bưởi!', 'Chết mày chưa!', 'Tha cho em anh ơi 😭'].map(msg => (
                                              <button key={msg} onClick={() => handleSendChat(msg)} style={{ background: '#333', color: '#fff', border: 'none', padding: '12px 15px', borderRadius: '10px', fontSize: '16px', textAlign: 'left', cursor: 'pointer', fontWeight: 'bold' }} onMouseEnter={e => e.currentTarget.style.background = '#444'} onMouseLeave={e => e.currentTarget.style.background = '#333'}>
                                                  {msg}
                                              </button>
                                          ))}
                                      </div>
                                      <div style={{ display: 'flex', gap: '10px' }}>
                                          <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendChat(chatInput)} placeholder="Nhập tin nhắn..." style={{ flex: 1, padding: '12px 20px', borderRadius: '30px', border: 'none', fontSize: '16px', outline: 'none', background: '#fff', color: '#000' }} maxLength={40} />
                                          <button onClick={() => handleSendChat(chatInput)} style={{ background: '#ff9f43', color: '#fff', border: 'none', borderRadius: '30px', padding: '0 25px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                                              GỬI
                                          </button>
                                      </div>
                                  </div>
                              )}
                          </div>
                          <button onClick={toggleMic} style={{ background: isMicOn ? 'rgba(46, 204, 113, 0.9)' : 'rgba(0,0,0,0.6)', color: isMicOn ? '#fff' : '#ff4757', border: `2px solid ${isMicOn ? '#2ecc71' : '#ff4757'}`, borderRadius: '50%', width: '65px', height: '65px', fontSize: '30px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease-in-out' }}>
                              {isMicOn ? '🎙️' : '🔇'}
                          </button>
                      </div>
                  )}

                  {gameState === 'playing' && currentTurn === 'bottom' && !isSpectator && !passedPlayers.includes('bottom') && (
                      <div className="action-buttons">
                          <button className="btn btn-green" onClick={handlePlayCards}>ĐÁNH BÀI</button>
                          <button className="btn btn-red" onClick={handlePassTurn}>BỎ QUA</button>
                          <button className="btn btn-orange" onClick={() => setSelectedCardIds([])}>CHỌN LẠI</button>
                      </div>
                  )}
                  
                {showLeaveWarning && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <div style={{ background: 'linear-gradient(135deg, #2c3e50, #1a252f)', border: '2px solid #e74c3c', borderRadius: '20px', padding: '30px', width: '450px', maxWidth: '90%', textAlign: 'center', boxShadow: '0 10px 40px rgba(231, 76, 60, 0.4)' }}>
                            <div style={{ fontSize: '50px', marginBottom: '10px' }}>⚠️</div>
                            <h2 style={{ color: '#e74c3c', marginTop: 0, textTransform: 'uppercase' }}>Cảnh báo rời bàn!</h2>
                            <p style={{ color: '#fff', fontSize: '18px', lineHeight: '1.6' }}>
                                Ván đấu đang diễn ra. Nếu rời bàn lúc này, bạn sẽ bị xử thua Cóng và phạt <br/>
                                <strong style={{ color: '#e74c3c', fontSize: '22px' }}>{formatMoney(26 * baseBet)}</strong>
                            </p>
                            <div style={{ display: 'flex', gap: '15px', marginTop: '25px' }}>
                                <button onClick={() => setShowLeaveWarning(false)} style={{ flex: 1, padding: '12px', background: '#95a5a6', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>QUAY LẠI CHƠI</button>
                                <button onClick={() => executeLeaveTable(true)} style={{ flex: 1, padding: '12px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(231, 76, 60, 0.5)' }}>THOÁT & CHỊU PHẠT</button>
                            </div>
                        </div>
                    </div>
                )}

                {showBankruptAlert && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <div style={{ background: 'linear-gradient(135deg, #1e272e, #2f3640)', border: '2px solid #f1c40f', borderRadius: '20px', padding: '30px', width: '450px', maxWidth: '90%', textAlign: 'center', boxShadow: '0 10px 40px rgba(241, 196, 15, 0.4)' }}>
                            <div style={{ fontSize: '60px', marginBottom: '10px' }}>💸</div>
                            <h2 style={{ color: '#f1c40f', marginTop: 0, textTransform: 'uppercase' }}>CHÁY TÚI RỒI!</h2>
                            <p style={{ color: '#fff', fontSize: '18px', lineHeight: '1.6' }}>
                                Số dư của bạn không đủ để tiếp tục thi đấu ở mức cược <strong style={{ color: '#2ecc71' }}>{formatMoney(baseBet)}</strong>.<br/>
                                Hệ thống sẽ đưa bạn về Sảnh Chờ!
                            </p>
                            <button onClick={() => executeLeaveTable(false)} style={{ marginTop: '25px', width: '100%', padding: '15px', background: 'linear-gradient(180deg, #f1c40f, #e67e22)', color: '#fff', border: '2px solid #fff', borderRadius: '10px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(241, 196, 15, 0.5)' }}>VỀ SẢNH NGAY</button>
                        </div>
                    </div>
                )}
                  <PlayerHand 
                        hand={hand} selectedCardIds={selectedCardIds} onCardClick={handleCardClick} 
                        isInvalidPlay={isInvalidPlay} thoiHeoCardIds={thoiHeoCardIds} 
                        onReorder={setHand} onSwipeUp={handlePlayCards} gameState={gameState} isDragMode={isDragMode} 
                    />
              </div>
            </div>
        )}
    </>
  );
}

export default App;