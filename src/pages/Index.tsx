import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';

// Типы персонажей с эмодзи оружия
const CHARACTER_TYPES = [
  { name: 'Мечник', weapon: '⚔️', defaultHP: 100 },
  { name: 'Лучник', weapon: '🏹', defaultHP: 90 },
  { name: 'Щитоносец', weapon: '🛡️', defaultHP: 120 },
  { name: 'Маг', weapon: '🔮', defaultHP: 80 },
  { name: 'Копейщик', weapon: '🗡️', defaultHP: 95 },
  { name: 'Косарь', weapon: '⚰️', defaultHP: 110 },
  { name: 'Молотобоец', weapon: '🔨', defaultHP: 115 },
  { name: 'Топорщик', weapon: '🪓', defaultHP: 105 },
  { name: 'Кинжальщик', weapon: '🗡️', defaultHP: 85 },
  { name: 'Булавоносец', weapon: '⚔️', defaultHP: 100 },
  { name: 'Алебардист', weapon: '🗡️', defaultHP: 90 },
  { name: 'Трезубец', weapon: '🔱', defaultHP: 95 },
  { name: 'Арбалетчик', weapon: '🎯', defaultHP: 88 },
  { name: 'Катанщик', weapon: '⚔️', defaultHP: 92 },
  { name: 'Берсерк', weapon: '⚡', defaultHP: 130 }
];

interface Character {
  id: number;
  type: typeof CHARACTER_TYPES[0];
  hp: number;
  maxHP: number;
  attackSpeed: number;
  moveSpeed: number;
  isAlive: boolean;
}

interface BattleState {
  isActive: boolean;
  countdown: number;
  winner: Character | null;
  battleLog: string[];
}

const Index = () => {
  const [characters, setCharacters] = useState<Character[]>(() =>
    CHARACTER_TYPES.map((type, index) => ({
      id: index,
      type,
      hp: type.defaultHP,
      maxHP: type.defaultHP,
      attackSpeed: 1.0,
      moveSpeed: 1.0,
      isAlive: true
    }))
  );

  const [selectedFighter1, setSelectedFighter1] = useState<number | null>(null);
  const [selectedFighter2, setSelectedFighter2] = useState<number | null>(null);
  const [settingsCharacter, setSettingsCharacter] = useState<number | null>(null);
  const [battleState, setBattleState] = useState<BattleState>({
    isActive: false,
    countdown: 0,
    winner: null,
    battleLog: []
  });

  const battleIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Обработка клика левой кнопкой мыши (выбор бойцов)
  const handleCharacterSelect = (id: number) => {
    if (battleState.isActive) return;
    
    if (selectedFighter1 === null) {
      setSelectedFighter1(id);
    } else if (selectedFighter2 === null && id !== selectedFighter1) {
      setSelectedFighter2(id);
    } else {
      // Сброс выбора
      setSelectedFighter1(id);
      setSelectedFighter2(null);
    }
  };

  // Обработка клика правой кнопкой мыши (настройки)
  const handleContextMenu = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    if (battleState.isActive) return;
    setSettingsCharacter(settingsCharacter === id ? null : id);
  };

  // Обновление параметров персонажа
  const updateCharacterStat = (id: number, stat: 'hp' | 'attackSpeed' | 'moveSpeed', value: number) => {
    setCharacters(prev => prev.map(char => 
      char.id === id 
        ? { 
            ...char, 
            [stat]: stat === 'hp' ? value : value / 10,
            maxHP: stat === 'hp' ? value : char.maxHP
          }
        : char
    ));
  };

  // Запуск битвы
  const startBattle = () => {
    if (selectedFighter1 === null || selectedFighter2 === null) return;

    setBattleState(prev => ({ ...prev, countdown: 5, battleLog: [] }));
    
    countdownIntervalRef.current = setInterval(() => {
      setBattleState(prev => {
        if (prev.countdown <= 1) {
          clearInterval(countdownIntervalRef.current!);
          // Запуск битвы
          startActualBattle();
          return { ...prev, countdown: 0, isActive: true };
        }
        return { ...prev, countdown: prev.countdown - 1 };
      });
    }, 1000);
  };

  // Основная логика битвы
  const startActualBattle = () => {
    const fighter1 = characters[selectedFighter1!];
    const fighter2 = characters[selectedFighter2!];
    
    battleIntervalRef.current = setInterval(() => {
      setCharacters(prev => {
        const f1 = prev[selectedFighter1!];
        const f2 = prev[selectedFighter2!];
        
        if (!f1.isAlive || !f2.isAlive) {
          clearInterval(battleIntervalRef.current!);
          setBattleState(prevBattle => ({
            ...prevBattle,
            isActive: false,
            winner: f1.isAlive ? f1 : f2
          }));
          return prev;
        }

        const newChars = [...prev];
        
        // F1 атакует F2
        if (Math.random() < f1.attackSpeed / 2) {
          const damage = Math.floor(Math.random() * 20) + 10;
          newChars[selectedFighter2!] = {
            ...f2,
            hp: Math.max(0, f2.hp - damage),
            isAlive: f2.hp - damage > 0
          };
          
          setBattleState(prevBattle => ({
            ...prevBattle,
            battleLog: [...prevBattle.battleLog, `${f1.type.name} наносит ${damage} урона ${f2.type.name}!`].slice(-5)
          }));
        }
        
        // F2 атакует F1
        if (Math.random() < f2.attackSpeed / 2 && newChars[selectedFighter2!].isAlive) {
          const damage = Math.floor(Math.random() * 20) + 10;
          newChars[selectedFighter1!] = {
            ...f1,
            hp: Math.max(0, f1.hp - damage),
            isAlive: f1.hp - damage > 0
          };
          
          setBattleState(prevBattle => ({
            ...prevBattle,
            battleLog: [...prevBattle.battleLog, `${f2.type.name} наносит ${damage} урона ${f1.type.name}!`].slice(-5)
          }));
        }
        
        return newChars;
      });
    }, 500);
  };

  // Сброс битвы
  const resetBattle = () => {
    if (battleIntervalRef.current) clearInterval(battleIntervalRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    setBattleState({
      isActive: false,
      countdown: 0,
      winner: null,
      battleLog: []
    });
    
    // Восстановление HP всех персонажей
    setCharacters(prev => prev.map(char => ({
      ...char,
      hp: char.maxHP,
      isAlive: true
    })));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4" style={{ fontFamily: 'monospace' }}>
      {/* Заголовок */}
      <div className="text-center mb-8">
        <h1 className="text-6xl font-bold mb-2 text-red-500 tracking-wider" style={{ textShadow: '4px 4px 0px #000' }}>
          BATTLE ARENA
        </h1>
        <p className="text-lg text-yellow-400">Выбери двух бойцов и запусти битву!</p>
      </div>

      {/* Персонажи */}
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        {characters.map((character) => (
          <div
            key={character.id}
            className={`relative cursor-pointer transition-all duration-200 ${
              selectedFighter1 === character.id 
                ? 'ring-4 ring-blue-500 scale-110' 
                : selectedFighter2 === character.id 
                ? 'ring-4 ring-red-500 scale-110' 
                : 'hover:scale-105'
            }`}
            onClick={() => handleCharacterSelect(character.id)}
            onContextMenu={(e) => handleContextMenu(e, character.id)}
          >
            <Card className="w-20 h-20 bg-gray-800 border-2 border-yellow-600 flex flex-col items-center justify-center p-2">
              <div className="text-2xl mb-1">{character.type.weapon}</div>
              <div className="text-xs text-center text-yellow-400">{character.type.name}</div>
              
              {/* HP Bar */}
              <div className="w-full h-2 bg-gray-700 rounded mt-1">
                <div 
                  className="h-full bg-red-500 rounded"
                  style={{ width: `${(character.hp / character.maxHP) * 100}%` }}
                />
              </div>
              <div className="text-xs text-white">{character.hp}/{character.maxHP}</div>
            </Card>
            
            {/* Индикатор выбора */}
            {selectedFighter1 === character.id && (
              <div className="absolute -top-2 -left-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                1
              </div>
            )}
            {selectedFighter2 === character.id && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                2
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Панель настроек */}
      {settingsCharacter !== null && (
        <Card className="max-w-md mx-auto mb-8 p-4 bg-gray-800 border-yellow-600">
          <h3 className="text-lg font-bold text-yellow-400 mb-4">
            Настройки: {characters[settingsCharacter].type.name}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Здоровье: {characters[settingsCharacter].hp}</label>
              <Slider
                value={[characters[settingsCharacter].hp]}
                onValueChange={([value]) => updateCharacterStat(settingsCharacter, 'hp', value)}
                max={200}
                min={50}
                step={10}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Скорость атаки: {(characters[settingsCharacter].attackSpeed * 10).toFixed(1)}
              </label>
              <Slider
                value={[characters[settingsCharacter].attackSpeed * 10]}
                onValueChange={([value]) => updateCharacterStat(settingsCharacter, 'attackSpeed', value)}
                max={30}
                min={5}
                step={1}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Скорость движения: {(characters[settingsCharacter].moveSpeed * 10).toFixed(1)}
              </label>
              <Slider
                value={[characters[settingsCharacter].moveSpeed * 10]}
                onValueChange={([value]) => updateCharacterStat(settingsCharacter, 'moveSpeed', value)}
                max={30}
                min={5}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Управление битвой */}
      <div className="text-center mb-8">
        {battleState.countdown > 0 && (
          <div className="text-8xl font-bold text-yellow-400 mb-4 animate-pulse">
            {battleState.countdown}
          </div>
        )}
        
        {battleState.winner && (
          <div className="mb-4">
            <h2 className="text-4xl font-bold text-green-400 mb-2">
              🏆 ПОБЕДИЛ: {battleState.winner.type.name}! 🏆
            </h2>
          </div>
        )}
        
        <div className="space-x-4">
          <Button 
            onClick={startBattle}
            disabled={selectedFighter1 === null || selectedFighter2 === null || battleState.isActive || battleState.countdown > 0}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 text-lg"
          >
            {battleState.countdown > 0 ? 'НАЧИНАЕТСЯ...' : 'НАЧАТЬ БИТВУ!'}
          </Button>
          
          <Button 
            onClick={resetBattle}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 text-lg"
          >
            СБРОС
          </Button>
        </div>
      </div>

      {/* Лог битвы */}
      {battleState.battleLog.length > 0 && (
        <Card className="max-w-2xl mx-auto p-4 bg-gray-800 border-yellow-600">
          <h3 className="text-lg font-bold text-yellow-400 mb-2">Ход битвы:</h3>
          <div className="space-y-1">
            {battleState.battleLog.map((log, index) => (
              <div key={index} className="text-sm text-gray-300 font-mono">
                {log}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Инструкции */}
      <div className="mt-8 text-center text-sm text-gray-400">
        <p>ЛКМ - выбор бойца | ПКМ - настройки персонажа</p>
      </div>
    </div>
  );
};

export default Index;