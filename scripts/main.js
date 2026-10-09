const MODULE_ID = 'StrThings-coinflip';

Hooks.once('init', () => {
  console.log(`${MODULE_ID} | Инициализация`);

  game.settings.register(MODULE_ID, 'headsVideo', {
    name: 'Видео для Орла',
    hint: 'Путь к видеофайлу',
    scope: 'world',
    config: true,
    type: String,
    filePicker: 'video',
    default: `modules/${MODULE_ID}/assets/heads.webm`
  });

  game.settings.register(MODULE_ID, 'tailsVideo', {
    name: 'Видео для Решки',
    hint: 'Путь к видеофайлу',
    scope: 'world',
    config: true,
    type: String,
    filePicker: 'video',
    default: `modules/${MODULE_ID}/assets/tails.webm`
  });
});

function getInterfaceVolume() {
  return game.settings.storage.get('client')?.['core.globalInterfaceVolume'] ?? 1;
}

async function flipCoin() {
  const token = canvas.tokens?.controlled?.[0];
  if (!token) {
    ui.notifications.warn('Coin Flip | Сначала выберите токен на сцене.');
    return;
  }

  const roll = new Roll('1d2');
  await roll.evaluate();

  const result = roll.total;
  const isHeads = result === 1;
  const outcomeText = isHeads ? 'Орёл' : 'Решка';
  const videoPath = game.settings.get(MODULE_ID, isHeads ? 'headsVideo' : 'tailsVideo');

  const isMuted = 0;
  const volume = isMuted ? 0 : getInterfaceVolume();

  const videoId = `coin-flip-video-${foundry.utils.randomID()}`;

  const chatContent = `
    <div class="coin-flip-result">
      <video id="${videoId}"
             width="300"
             autoplay
             playsinline
             data-coin-flip-volume="${isMuted ? 'muted' : 'interface'}">
        <source src="${videoPath}" type="video/webm">
        <source src="${videoPath}" type="video/mp4">
        Ваш браузер не поддерживает видео.
      </video>
      <h3>Бросок монетки: ${outcomeText}!</h3>
    </div>
  `;

  await ChatMessage.create({
    content: chatContent,
    speaker: ChatMessage.getSpeaker({ token: token.document }),
    rolls: [roll],
    flags: { [MODULE_ID]: { result, videoId } },
    notify: false
  });

  setTimeout(() => {
    const videoEl = document.getElementById(videoId);
    if (videoEl && !isMuted) {
      videoEl.volume = getInterfaceVolume();
    }
  }, 100);
}

window.flipCoin = flipCoin;

Hooks.on('globalInterfaceVolumeChanged', (volume) => {
  document.querySelectorAll('video[data-coin-flip-volume="interface"]').forEach((videoEl) => {
    videoEl.volume = volume;
  });
});

Hooks.on('chatMessage', (chatLog, message, chatData) => {
  if (message.trim().toLowerCase() !== '/coinflip') return true;
  flipCoin();
  return false;
});

Hooks.on('getSceneControlButtons', (controls) => {
  let tokenControls;
  if (Array.isArray(controls)) {
    tokenControls = controls.find(c => c.name === 'token');
  } else if (controls?.tokens) {
    tokenControls = controls.tokens;
  }
  if (!tokenControls) return;

  const newTool = {
    name: 'coin-flip-button',
    title: 'Бросить монетку',
    icon: 'fas fa-coins',
    visible: true,
    button: true,
    onClick: () => flipCoin()
  };

  if (Array.isArray(tokenControls.tools)) {
    tokenControls.tools.push(newTool);
  } else {
    tokenControls.tools[newTool.name] = newTool;
  }
});