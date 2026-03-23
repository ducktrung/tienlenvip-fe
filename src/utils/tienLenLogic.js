// client/src/utils/tienLenLogic.js

const rankMap = { '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15 };
const suitPower = { 'spades': 1, 'clubs': 2, 'diamonds': 3, 'hearts': 4 }; 

export const getCardPower = (card) => rankMap[card.value] * 10 + suitPower[card.suit];

export const sortCards = (cards) => {
    return [...cards].sort((a, b) => getCardPower(a) - getCardPower(b));
};

export const getHandType = (cards) => {
    if (!cards || cards.length === 0) return { type: 'invalid' };
    const sorted = sortCards(cards);
    const len = sorted.length;
    const highest = sorted[len - 1];
    
    if (len === 1) return { type: 'rac', highest };
    
    const isAllSameRank = sorted.every(c => c.value === sorted[0].value);
    if (len === 2 && isAllSameRank) return { type: 'doi', highest };
    if (len === 3 && isAllSameRank) return { type: 'samco', highest };
    if (len === 4 && isAllSameRank) return { type: 'tuquy', highest };
    
    const isSanh = len >= 3 && sorted.every((c, i) => {
        if (c.value === '2') return false; 
        if (i === 0) return true;
        return rankMap[c.value] === rankMap[sorted[i-1].value] + 1;
    });
    if (isSanh) return { type: 'sanh', highest, length: len };
    
    if (len >= 6 && len % 2 === 0) {
        let isDoiThong = true;
        for (let i = 0; i < len; i += 2) {
            if (sorted[i].value !== sorted[i+1].value) { isDoiThong = false; break; }
            if (sorted[i].value === '2') { isDoiThong = false; break; }
            if (i > 0 && rankMap[sorted[i].value] !== rankMap[sorted[i-2].value] + 1) { isDoiThong = false; break; }
        }
        if (isDoiThong) {
            if (len === 6) return { type: '3doithong', highest };
            if (len === 8) return { type: '4doithong', highest };
        }
    }
    return { type: 'invalid' };
};

export const canPlayCards = (playCards, tableCards) => {
    const playType = getHandType(playCards);
    if (playType.type === 'invalid') return { valid: false };
    
    if (!tableCards || tableCards.length === 0) return { valid: true };
    
    const tableType = getHandType(tableCards);
    
    if (playType.type === tableType.type && playCards.length === tableCards.length) {
        return { valid: getCardPower(playType.highest) > getCardPower(tableType.highest) };
    }
    
    if (tableType.type === 'rac' && tableType.highest.value === '2') {
        if (['3doithong', 'tuquy', '4doithong'].includes(playType.type)) return { valid: true };
    }
    if (tableType.type === 'doi' && tableType.highest.value === '2') {
        if (['tuquy', '4doithong'].includes(playType.type)) return { valid: true };
    }
    if (tableType.type === '3doithong') {
        if (['tuquy', '4doithong'].includes(playType.type)) return { valid: true };
    }
    if (tableType.type === 'tuquy') {
        if (playType.type === '4doithong') return { valid: true };
    }
    
    return { valid: false };
};

export const checkToiTrang = (cards) => {
    const sorted = sortCards(cards);
    if (sorted.filter(c => c.value === '2').length === 4) return "TỨ QUÝ HEO";
    
    const uniqueRanks = [...new Set(sorted.map(c => rankMap[c.value]))].filter(r => r !== 15);
    if (uniqueRanks.length === 12) return "SẢNH RỒNG";
    
    let pairs = 0;
    let temp = [...sorted];
    for (let i = 0; i < temp.length - 1; i++) {
        if (temp[i].value === temp[i+1].value) {
            pairs++;
            i++; 
        }
    }
    if (pairs >= 6) return "6 ĐÔI THÔNG/BẤT KỲ";
    
    return null;
};

export const createShuffledDeck = () => {
    const suits = ['spades', 'clubs', 'diamonds', 'hearts'];
    const values = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
    let deck = [];
    suits.forEach(suit => { values.forEach(value => { deck.push({ id: `${value}-${suit}`, suit, value }); }); });
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    return deck;
};

export const findValidPlay = (aiHand, tableCards) => { return null; };

export const calculatePenalty = (remainingCards, baseBet) => {
    let penaltyMultiplier = 0;
    if (remainingCards.length === 13) {
        penaltyMultiplier += 26; 
    } else {
        penaltyMultiplier += remainingCards.length;
    }
    remainingCards.forEach(card => {
        if (card.value === '2') {
            if (card.suit === 'spades' || card.suit === 'clubs') penaltyMultiplier += 3;
            if (card.suit === 'hearts' || card.suit === 'diamonds') penaltyMultiplier += 6;
        }
    });
    return penaltyMultiplier * baseBet; 
};