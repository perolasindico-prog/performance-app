/* ═══════════════════════════════════════════════════════
   Birthday Website for Swilam
   Built with love, every interaction matters
   ═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── State ───
  let currentScreen = 0;
  const totalScreens = 6; // 0-5

  // ─── DOM Helpers ───
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ─── Preloader ───
  function hidePreloader() {
    setTimeout(() => {
      $('#preloader').classList.add('hidden');
    }, 2000);
  }

  // ─── Floating Hearts (Entrance) ───
  function createFloatingHearts() {
    const container = $('#entrance-hearts');
    const hearts = ['💕', '💖', '💗', '✨', '🌸', '💜', '🩷', '🤍'];

    for (let i = 0; i < 20; i++) {
      const heart = document.createElement('span');
      heart.className = 'floating-heart';
      heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
      heart.style.left = Math.random() * 100 + '%';
      heart.style.animationDuration = (4 + Math.random() * 4) + 's';
      heart.style.animationDelay = (Math.random() * 6) + 's';
      heart.style.fontSize = (0.8 + Math.random() * 1) + 'rem';
      container.appendChild(heart);
    }
  }

  // ─── Screen Navigation ───
  function goToScreen(index) {
    const current = $(`#screen-${currentScreen}`);
    const next = $(`#screen-${index}`);

    if (!next) return;

    // Exit current
    current.classList.remove('active');
    current.classList.add('exiting');

    setTimeout(() => {
      current.classList.remove('exiting');
    }, 800);

    // Enter next
    setTimeout(() => {
      next.classList.add('active');
      currentScreen = index;

      // Trigger screen-specific logic
      if (index === 4) startLoadingSequence();
      if (index === 5) startFinale();
    }, 400);
  }

  // ─── Screen 0: Entrance ───
  function initEntrance() {
    const btnStart = $('#btn-start');
    const envelope = $('#envelope');

    btnStart.addEventListener('click', () => {
      // Animate envelope opening
      envelope.classList.add('open');

      // Transition to first question
      setTimeout(() => {
        goToScreen(1);
      }, 1000);
    });

    // Also allow clicking the envelope
    envelope.addEventListener('click', () => {
      envelope.classList.add('open');
      setTimeout(() => {
        goToScreen(1);
      }, 1000);
    });
  }

  // ─── Question Screens (1 & 2) ───
  function initQuestions() {
    // Screen 1
    initQuestionScreen(1, 2);
    // Screen 2
    initQuestionScreen(2, 3);
  }

  function initQuestionScreen(screenNum, nextScreenNum) {
    const screen = $(`#screen-${screenNum}`);
    const options = screen.querySelectorAll('.btn-option');
    const feedback = $(`#feedback-${screenNum}`);

    options.forEach(btn => {
      btn.addEventListener('click', () => {
        // Disable all options
        options.forEach(o => o.disabled = true);

        const isCorrect = btn.dataset.answer === 'right';
        const response = btn.dataset.response;

        // Show visual feedback
        btn.classList.add(isCorrect ? 'correct' : 'wrong');

        // Show text feedback
        feedback.textContent = response;
        feedback.className = 'question-feedback visible ' + (isCorrect ? 'correct' : 'wrong-fb');

        if (isCorrect) {
          // Move to next screen after delay
          setTimeout(() => {
            goToScreen(nextScreenNum);
          }, 1800);
        } else {
          // Re-enable after wrong answer
          setTimeout(() => {
            btn.classList.remove('wrong');
            options.forEach(o => {
              if (!o.classList.contains('correct')) {
                o.disabled = false;
              }
            });
            feedback.classList.remove('visible');
          }, 1500);
        }
      });
    });
  }

  // ─── Screen 3: Slider ───
  function initSlider() {
    const slider = $('#fun-slider');
    const value = $('#slider-value');
    const result = $('#slider-result');
    const message = result.querySelector('.slider-message');
    const btnNext = $('#btn-slider-next');

    const messages = {
      8: 'Super incrível!',
      9: 'Mega incrível!',
      10: 'A MAIS incrível do universo! 🌌'
    };

    slider.addEventListener('input', () => {
      const val = parseInt(slider.value);
      value.textContent = val;
      message.textContent = messages[val] || '';

      // Pulse effect on max
      if (val === 10) {
        result.style.borderColor = '#FF6F9C';
        result.style.background = '#FFF0F6';
      } else {
        result.style.borderColor = '';
        result.style.background = '';
      }
    });

    btnNext.addEventListener('click', () => {
      goToScreen(4);
    });
  }

  // ─── Screen 4: Loading Sequence ───
  function startLoadingSequence() {
    const bar = $('#loading-bar');
    const msg = $('#loading-msg');

    const messages = [
      { text: 'A analisar nível de fofura...', progress: 15 },
      { text: 'Fofura detectada: MÁXIMA! 📈', progress: 30 },
      { text: 'A contar estrelas no céu para ti...', progress: 45 },
      { text: 'A embrulhar a surpresa... 🎁', progress: 60 },
      { text: 'A polvilhar purpurina mágica... ✨', progress: 75 },
      { text: 'Quase lá...', progress: 88 },
      { text: 'PRONTO! 🎉', progress: 100 },
    ];

    let i = 0;
    function nextMessage() {
      if (i >= messages.length) {
        // Transition to finale
        setTimeout(() => {
          goToScreen(5);
        }, 800);
        return;
      }

      const { text, progress } = messages[i];
      msg.style.opacity = '0';

      setTimeout(() => {
        msg.textContent = text;
        msg.style.opacity = '1';
        bar.style.width = progress + '%';
        i++;
        setTimeout(nextMessage, 900);
      }, 200);
    }

    setTimeout(nextMessage, 500);
  }

  // ─── Screen 5: Grand Finale ───
  function startFinale() {
    startConfetti();
    createSparkles();
  }

  // ─── Confetti Engine ───
  function startConfetti() {
    const canvas = $('#confetti-canvas');
    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const colors = [
      '#FF3D7F', '#FF6F9C', '#B794F6', '#9F6EF0',
      '#FFD166', '#FFC233', '#FF9EBF', '#D4BFFF',
      '#4ade80', '#60a5fa', '#f472b6', '#c084fc'
    ];

    const confettiPieces = [];
    const TOTAL = 150;

    class Confetti {
      constructor() {
        this.reset();
        this.y = Math.random() * -canvas.height;
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = -20;
        this.w = 6 + Math.random() * 8;
        this.h = 4 + Math.random() * 4;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.vy = 1.5 + Math.random() * 3;
        this.vx = (Math.random() - 0.5) * 2;
        this.angle = Math.random() * 360;
        this.angleSpeed = (Math.random() - 0.5) * 8;
        this.opacity = 0.8 + Math.random() * 0.2;
        this.shape = Math.random() > 0.5 ? 'rect' : 'circle';
      }

      update() {
        this.y += this.vy;
        this.x += this.vx + Math.sin(this.y * 0.01) * 0.5;
        this.angle += this.angleSpeed;

        if (this.y > canvas.height + 20) {
          this.reset();
        }
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.angle * Math.PI) / 180);
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;

        if (this.shape === 'rect') {
          ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, this.w / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    }

    // Create confetti pieces in waves
    function addWave(count) {
      for (let i = 0; i < count; i++) {
        confettiPieces.push(new Confetti());
      }
    }

    addWave(TOTAL);

    // Second burst after 2s
    setTimeout(() => addWave(50), 2000);

    let running = true;
    function animate() {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      confettiPieces.forEach(p => {
        p.update();
        p.draw();
      });

      requestAnimationFrame(animate);
    }

    animate();

    // Slow down and stop after 10 seconds
    setTimeout(() => {
      confettiPieces.forEach(p => {
        p.vy *= 0.5;
      });
    }, 8000);

    setTimeout(() => {
      running = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, 14000);
  }

  // ─── Sparkle Particles ───
  function createSparkles() {
    const colors = ['#FF3D7F', '#FFD166', '#B794F6', '#FF9EBF', '#4ade80'];

    function addSparkle() {
      const el = document.createElement('div');
      el.className = 'sparkle-particle';
      el.style.left = (10 + Math.random() * 80) + '%';
      el.style.top = (20 + Math.random() * 60) + '%';
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.width = (3 + Math.random() * 5) + 'px';
      el.style.height = el.style.width;
      document.body.appendChild(el);

      setTimeout(() => el.remove(), 3000);
    }

    // Burst of sparkles
    for (let i = 0; i < 20; i++) {
      setTimeout(addSparkle, i * 150);
    }

    // Occasional sparkles for 8 seconds
    const interval = setInterval(addSparkle, 400);
    setTimeout(() => clearInterval(interval), 8000);
  }

  // ─── Replay ───
  function initReplay() {
    $('#btn-replay').addEventListener('click', () => {
      // Reset everything
      $$('.screen').forEach(s => {
        s.classList.remove('active', 'exiting');
      });

      // Reset questions
      $$('.btn-option').forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('correct', 'wrong');
      });
      $$('.question-feedback').forEach(fb => {
        fb.className = 'question-feedback';
        fb.textContent = '';
      });

      // Reset slider
      const slider = $('#fun-slider');
      slider.value = 9;
      $('#slider-value').textContent = '9';

      // Reset loading bar
      $('#loading-bar').style.width = '0%';
      $('#loading-msg').textContent = 'A analisar dados...';

      // Reset finale animations by re-triggering
      const finaleContent = $('.finale-content');
      finaleContent.style.display = 'none';
      setTimeout(() => {
        finaleContent.style.display = '';
      }, 50);

      // Go back to entrance
      currentScreen = 0;
      $('#screen-0').classList.add('active');
    });
  }

  // ─── Init ───
  function init() {
    hidePreloader();
    createFloatingHearts();
    initEntrance();
    initQuestions();
    initSlider();
    initReplay();
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
