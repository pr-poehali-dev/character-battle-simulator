import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';

// Типы персонажей с эмодзи оружия
const CHARACTER_TYPES = [
  { name: 'Мечник', weapon: '⚔️', defaultHP: 100, color: '#FFD700', attackRange: 40 },
  { name: 'Лучник', weapon: '🏹', defaultHP: 90, color: '#8B4513', attackRange: 80 },
  { name: 'Щитоносец', weapon: '🛡️', defaultHP: 120, color: '#C0C0C0', attackRange: 30 },
  { name: 'Маг', weapon: '🔮', defaultHP: 80, color: '#9370DB', attackRange: 60 },
  { name: 'Копейщик', weapon: '🗡️', defaultHP: 95, color: '#708090', attackRange: 50 },
  { name: 'Косарь', weapon: '⚰️', defaultHP: 110, color: '#2F4F4F', attackRange: 45 },
  { name: 'Молотобоец', weapon: '🔨', defaultHP: 115, color: '#B22222', attackRange: 35 },
  { name: 'Топорщик', weapon: '🪓', defaultHP: 105, color: '#8B4513', attackRange: 40 },
  { name: 'Кинжальщик', weapon: '🗡️', defaultHP: 85, color: '#FF4500', attackRange: 25 },
  { name: 'Булавоносец', weapon: '⚔️', defaultHP: 100, color: '#DAA520', attackRange: 38 },
  { name: 'Алебардист', weapon: '🗡️', defaultHP: 90, color: '#4682B4', attackRange: 55 },
  { name: 'Трезубец', weapon: '🔱', defaultHP: 95, color: '#20B2AA', attackRange: 48 },
  { name: 'Арбалетчик', weapon: '🎯', defaultHP: 88, color: '#CD853F', attackRange: 75 },
  { name: 'Катанщик', weapon: '⚔️', defaultHP: 92, color: '#DC143C', attackRange: 42 },
  { name: 'Берсерк', weapon: '⚡', defaultHP: 130, color: '#FF0000', attackRange: 50 }
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

interface FighterState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  isAttacking: boolean;
  attackCooldown: number;
  direction: number; // -1 влево, 1 вправо
}

interface BattleState {
  isActive: boolean;
  countdown: number;
  winner: Character | null;
  battleLog: string[];
  fighter1: FighterState;
  fighter2: FighterState;
  hitEffect: { show: boolean; x: number; y: number; type: string } | null;
}

const ARENA_WIDTH = 500;
const ARENA_HEIGHT = 300;
const FIGHTER_SIZE = 32;

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
    battleLog: [],
    fighter1: {
      x: 80,
      y: ARENA_HEIGHT / 2,
      targetX: 80,
      targetY: ARENA_HEIGHT / 2,
      isAttacking: false,
      attackCooldown: 0,
      direction: 1
    },
    fighter2: {
      x: ARENA_WIDTH - 80,
      y: ARENA_HEIGHT / 2,
      targetX: ARENA_WIDTH - 80,
      targetY: ARENA_HEIGHT / 2,
      isAttacking: false,
      attackCooldown: 0,
      direction: -1
    },
    hitEffect: null
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

  // Проверка расстояния между бойцами
  const getDistance = (x1: number, y1: number, x2: number, y2: number) => {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  };

  // Проверка коллизии атаки с противником
  const checkAttackCollision = (attacker: FighterState, target: FighterState, attackRange: number) => {
    const distance = getDistance(attacker.x, attacker.y, target.x, target.y);
    return distance <= attackRange && attacker.isAttacking;
  };

  // Запуск битвы
  const startBattle = () => {
    if (selectedFighter1 === null || selectedFighter2 === null) return;

    setBattleState(prev => ({ 
      ...prev, 
      countdown: 5, 
      battleLog: [],
      fighter1: {
        x: 80,
        y: ARENA_HEIGHT / 2,
        targetX: 80,
        targetY: ARENA_HEIGHT / 2,
        isAttacking: false,
        attackCooldown: 0,
        direction: 1
      },
      fighter2: {
        x: ARENA_WIDTH - 80,
        y: ARENA_HEIGHT / 2,
        targetX: ARENA_WIDTH - 80,
        targetY: ARENA_HEIGHT / 2,
        isAttacking: false,
        attackCooldown: 0,
        direction: -1
      },
      hitEffect: null
    }));
    
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
    battleIntervalRef.current = setInterval(() => {
      setBattleState(prevBattle => {
        const f1Char = characters[selectedFighter1!];
        const f2Char = characters[selectedFighter2!];
        
        if (!f1Char.isAlive || !f2Char.isAlive) {
          clearInterval(battleIntervalRef.current!);
          return {
            ...prevBattle,
            isActive: false,
            winner: f1Char.isAlive ? f1Char : f2Char
          };
        }

        let newF1 = { ...prevBattle.fighter1 };
        let newF2 = { ...prevBattle.fighter2 };
        let newBattleLog = [...prevBattle.battleLog];
        let newHitEffect = prevBattle.hitEffect;

        // Случайное движение по Y для разнообразия
        if (Math.random() < 0.1) {
          newF1.y = Math.max(50, Math.min(ARENA_HEIGHT - 50, newF1.y + (Math.random() - 0.5) * 20));
          newF2.y = Math.max(50, Math.min(ARENA_HEIGHT - 50, newF2.y + (Math.random() - 0.5) * 20));
        }

        // Уменьшаем кулдауны атак
        if (newF1.attackCooldown > 0) newF1.attackCooldown--;
        if (newF2.attackCooldown > 0) newF2.attackCooldown--;

        // Сброс атаки если кулдаун закончился
        if (newF1.attackCooldown === 0) newF1.isAttacking = false;
        if (newF2.attackCooldown === 0) newF2.isAttacking = false;

        // ИИ движения и атак для Fighter 1
        const distanceF1toF2 = getDistance(newF1.x, newF1.y, newF2.x, newF2.y);
        
        if (distanceF1toF2 > f1Char.type.attackRange + 10) {
          // Двигаемся к противнику
          const moveSpeed = f1Char.moveSpeed * 3;
          if (newF1.x < newF2.x) {
            newF1.x = Math.min(newF1.x + moveSpeed, newF2.x - f1Char.type.attackRange);
            newF1.direction = 1;
          } else {
            newF1.x = Math.max(newF1.x - moveSpeed, newF2.x + f1Char.type.attackRange);
            newF1.direction = -1;
          }
        } else if (newF1.attackCooldown === 0) {
          // В радиусе атаки - атакуем
          newF1.isAttacking = true;
          newF1.attackCooldown = Math.max(10, 30 - f1Char.attackSpeed * 8);
        }

        // ИИ движения и атак для Fighter 2
        const distanceF2toF1 = getDistance(newF2.x, newF2.y, newF1.x, newF1.y);
        
        if (distanceF2toF1 > f2Char.type.attackRange + 10) {
          // Двигаемся к противнику
          const moveSpeed = f2Char.moveSpeed * 3;
          if (newF2.x > newF1.x) {
            newF2.x = Math.max(newF2.x - moveSpeed, newF1.x + f2Char.type.attackRange);
            newF2.direction = -1;
          } else {
            newF2.x = Math.min(newF2.x + moveSpeed, newF1.x - f2Char.type.attackRange);
            newF2.direction = 1;
          }
        } else if (newF2.attackCooldown === 0) {
          // В радиусе атаки - атакуем
          newF2.isAttacking = true;
          newF2.attackCooldown = Math.max(10, 30 - f2Char.attackSpeed * 8);
        }

        // Проверка попаданий
        let damageDealt = false;
        
        // F1 атакует F2
        if (checkAttackCollision(newF1, newF2, f1Char.type.attackRange)) {
          const damage = Math.floor(Math.random() * 15) + 10;
          setCharacters(prev => prev.map(char => 
            char.id === selectedFighter2! 
              ? { ...char, hp: Math.max(0, char.hp - damage), isAlive: char.hp - damage > 0 }
              : char
          ));
          
          newBattleLog = [...newBattleLog, `${f1Char.type.name} наносит ${damage} урона ${f2Char.type.name}!`].slice(-5);
          newHitEffect = { show: true, x: newF2.x, y: newF2.y, type: '💥' };
          damageDealt = true;
        }
        
        // F2 атакует F1
        if (checkAttackCollision(newF2, newF1, f2Char.type.attackRange)) {
          const damage = Math.floor(Math.random() * 15) + 10;
          setCharacters(prev => prev.map(char => 
            char.id === selectedFighter1! 
              ? { ...char, hp: Math.max(0, char.hp - damage), isAlive: char.hp - damage > 0 }
              : char
          ));
          
          newBattleLog = [...newBattleLog, `${f2Char.type.name} наносит ${damage} урона ${f1Char.type.name}!`].slice(-5);
          newHitEffect = { show: true, x: newF1.x, y: newF1.y, type: '💥' };
          damageDealt = true;
        }

        // Сброс эффекта попадания
        if (damageDealt) {
          setTimeout(() => {
            setBattleState(prev => ({ ...prev, hitEffect: null }));
          }, 400);
        }

        // Ограничиваем движение границами арены
        newF1.x = Math.max(FIGHTER_SIZE, Math.min(ARENA_WIDTH - FIGHTER_SIZE, newF1.x));
        newF2.x = Math.max(FIGHTER_SIZE, Math.min(ARENA_WIDTH - FIGHTER_SIZE, newF2.x));

        return {
          ...prevBattle,
          fighter1: newF1,
          fighter2: newF2,
          battleLog: newBattleLog,
          hitEffect: newHitEffect
        };
      });
    }, 100); // Более частое обновление для плавного движения
  };

  // Сброс битвы
  const resetBattle = () => {
    if (battleIntervalRef.current) clearInterval(battleIntervalRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    setBattleState({
      isActive: false,
      countdown: 0,
      winner: null,
      battleLog: [],
      fighter1: {
        x: 80,
        y: ARENA_HEIGHT / 2,
        targetX: 80,
        targetY: ARENA_HEIGHT / 2,
        isAttacking: false,
        attackCooldown: 0,
        direction: 1
      },
      fighter2: {
        x: ARENA_WIDTH - 80,
        y: ARENA_HEIGHT / 2,
        targetX: ARENA_WIDTH - 80,
        targetY: ARENA_HEIGHT / 2,
        isAttacking: false,
        attackCooldown: 0,
        direction: -1
      },
      hitEffect: null
    });
    
    // Восстановление HP всех персонажей
    setCharacters(prev => prev.map(char => ({
      ...char,
      hp: char.maxHP,
      isAlive: true
    })));
  };

  // Компонент анимированного бойца
  const AnimatedFighter = ({ 
    character, 
    fighterState, 
    isPlayer1 
  }: { 
    character: Character; 
    fighterState: FighterState; 
    isPlayer1: boolean; 
  }) => {
    const getAnimationTransform = () => {
      if (fighterState.isAttacking) {
        return `scale(1.2) rotate(${fighterState.direction * 15}deg)`;
      }
      return 'scale(1) rotate(0deg)';
    };

    const getWeaponPosition = () => {
      if (fighterState.isAttacking) {
        return {
          x: fighterState.direction * character.type.attackRange * 0.7,
          y: -5
        };
      }
      return {
        x: fighterState.direction * 15,
        y: 5
      };
    };

    const weaponPos = getWeaponPosition();

    return (
      <div
        className="absolute transition-all duration-100 ease-out"
        style={{
          left: fighterState.x - FIGHTER_SIZE / 2,
          top: fighterState.y - FIGHTER_SIZE / 2,
        }}
      >
        {/* Тело персонажа */}
        <div
          className="relative w-8 h-8 rounded-full border-2 border-black flex items-center justify-center transition-all duration-100"
          style={{ 
            backgroundColor: character.type.color,
            transform: getAnimationTransform(),
            boxShadow: fighterState.isAttacking ? '0 0 15px currentColor' : 'none'
          }}
        >
          {/* Глаза */}
          <div 
            className="absolute top-1 w-1 h-1 bg-black rounded-full"
            style={{ left: fighterState.direction > 0 ? '8px' : '20px' }}
          />
          <div 
            className="absolute top-1 w-1 h-1 bg-black rounded-full"
            style={{ left: fighterState.direction > 0 ? '18px' : '10px' }}
          />
        </div>
        
        {/* Оружие */}
        <div
          className="absolute text-lg transition-all duration-100"
          style={{
            left: weaponPos.x,
            top: weaponPos.y,
            transform: fighterState.isAttacking ? 'scale(1.5)' : 'scale(1)',
            filter: fighterState.isAttacking ? 'drop-shadow(0 0 5px #ffff00)' : 'none'
          }}
        >
          {character.type.weapon}
        </div>
        
        {/* Радиус атаки (показывается только при атаке) */}
        {fighterState.isAttacking && (
          <div
            className="absolute border-2 border-red-500 rounded-full opacity-30"
            style={{
              width: character.type.attackRange * 2,
              height: character.type.attackRange * 2,
              left: -character.type.attackRange + FIGHTER_SIZE / 2,
              top: -character.type.attackRange + FIGHTER_SIZE / 2,
            }}
          />
        )}
        
        {/* HP бар над головой */}
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 w-16">
          <div className="text-xs text-white text-center mb-1 font-bold">{character.type.name}</div>
          <div className="w-full h-2 bg-gray-700 rounded border border-black">
            <div 
              className="h-full bg-red-500 rounded transition-all duration-300"
              style={{ width: `${(character.hp / character.maxHP) * 100}%` }}
            />
          </div>
          <div className="text-xs text-white text-center font-bold">{character.hp}/{character.maxHP}</div>
        </div>
      </div>
    );
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

      {/* Боевая арена */}
      {(selectedFighter1 !== null && selectedFighter2 !== null) && (
        <div className="max-w-4xl mx-auto mb-8">
          <div 
            className="relative bg-gray-800 border-4 border-yellow-600 rounded-lg overflow-hidden"
            style={{ 
              width: ARENA_WIDTH,
              height: ARENA_HEIGHT,
              margin: '0 auto',
              backgroundImage: 'radial-gradient(circle at 25% 25%, #333 2px, transparent 2px), radial-gradient(circle at 75% 75%, #333 2px, transparent 2px)',
              backgroundSize: '20px 20px'
            }}
          >
            {/* Линия посередине */}
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-yellow-600 transform -translate-x-0.5 opacity-50"></div>
            
            {/* Бойцы */}
            <AnimatedFighter 
              character={characters[selectedFighter1]} 
              fighterState={battleState.fighter1}
              isPlayer1={true}
            />
            <AnimatedFighter 
              character={characters[selectedFighter2]} 
              fighterState={battleState.fighter2}
              isPlayer1={false}
            />
            
            {/* Эффект попадания */}
            {battleState.hitEffect?.show && (
              <div
                className="absolute text-4xl animate-ping"
                style={{
                  left: battleState.hitEffect.x,
                  top: battleState.hitEffect.y,
                }}
              >
                {battleState.hitEffect.type}
              </div>
            )}
            
            {/* Счетчик для начала битвы */}
            {battleState.countdown > 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-8xl font-bold text-yellow-400 animate-pulse">
                  {battleState.countdown}
                </div>
              </div>
            )}
            
            {/* Объявление победителя */}
            {battleState.winner && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
                <div className="text-center">
                  <div className="text-6xl mb-4">🏆</div>
                  <div className="text-4xl font-bold text-green-400">
                    ПОБЕДИЛ:
                  </div>
                  <div className="text-3xl font-bold text-yellow-400">
                    {battleState.winner.type.name}!
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
        <p className="mt-2 text-yellow-500">Бойцы движутся автоматически и атакуют при касании оружием!</p>
      </div>
    </div>
  );
};

export default Index;