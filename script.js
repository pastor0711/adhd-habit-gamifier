// Goal Tracker Application
class GoalTracker {
    constructor() {
        this.goals = this.loadGoals();
        this.selectedColor = 'gray';
        this.soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
        this.darkMode = localStorage.getItem('darkMode') === 'true';
        this.sortBy = 'newest';
        this.init();
        this.startUpdateInterval();
    }

    init() {
        this.goalInput = document.getElementById('goalInput');
        this.addGoalBtn = document.getElementById('addGoalBtn');
        this.goalsContainer = document.getElementById('goalsContainer');
        this.emptyState = document.getElementById('emptyState');
        this.statsOverview = document.getElementById('statsOverview');
        this.sortSelect = document.getElementById('sortSelect');
        this.soundToggle = document.getElementById('toggleSound');
        this.darkModeToggle = document.getElementById('toggleDarkMode');

        // Color picker setup
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', (e) => this.selectColor(e.target));
        });
        document.querySelector('.color-option').classList.add('selected');

        // Event listeners
        this.addGoalBtn.addEventListener('click', () => this.addGoal());
        this.goalInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addGoal();
        });
        this.sortSelect.addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.render();
        });
        this.soundToggle.addEventListener('click', () => this.toggleSound());
        this.darkModeToggle.addEventListener('click', () => this.toggleDarkMode());
        
        // Update button displays
        this.soundToggle.textContent = this.soundEnabled ? '🔊 Sound On' : '🔇 Sound Off';
        if (!this.soundEnabled) this.soundToggle.classList.add('muted');
        
        // Apply dark mode if enabled
        if (this.darkMode) {
            document.body.classList.add('dark-mode');
            this.darkModeToggle.textContent = '☀️ Light Mode';
        } else {
            this.darkModeToggle.textContent = '🌙 Dark Mode';
        }

        this.render();
    }

    selectColor(element) {
        document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
        element.classList.add('selected');
        this.selectedColor = element.dataset.color;
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        localStorage.setItem('soundEnabled', this.soundEnabled);
        this.soundToggle.textContent = this.soundEnabled ? '🔊 Sound On' : '🔇 Sound Off';
        this.soundToggle.classList.toggle('muted');
        if (this.soundEnabled) this.playSound('success');
    }

    toggleDarkMode() {
        this.darkMode = !this.darkMode;
        localStorage.setItem('darkMode', this.darkMode);
        document.body.classList.toggle('dark-mode');
        this.darkModeToggle.textContent = this.darkMode ? '☀️ Light Mode' : '🌙 Dark Mode';
        this.playSound('success');
    }

    playSound(type) {
        if (!this.soundEnabled) return;
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        if (type === 'success') {
            oscillator.frequency.value = 800;
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } else if (type === 'milestone') {
            [600, 800, 1000].forEach((freq, i) => {
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                osc.connect(gain);
                gain.connect(audioContext.destination);
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.2, audioContext.currentTime + i * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.1 + 0.3);
                osc.start(audioContext.currentTime + i * 0.1);
                osc.stop(audioContext.currentTime + i * 0.1 + 0.3);
            });
        }
    }

    addGoal() {
        const goalName = this.goalInput.value.trim();
        
        if (!goalName) {
            alert('Please enter a goal name!');
            return;
        }

        const goal = {
            id: Date.now(),
            name: goalName,
            startTime: Date.now(),
            color: this.selectedColor,
            isPaused: false,
            pausedTime: 0,
            pausedAt: null,
            bestStreak: 0,
            notes: ''
        };

        this.goals.push(goal);
        this.saveGoals();
        this.goalInput.value = '';
        this.playSound('success');
        this.render();
    }

    pauseGoal(goalId) {
        const goal = this.goals.find(g => g.id === goalId);
        if (goal) {
            if (goal.isPaused) {
                // Resume
                const pauseDuration = Date.now() - goal.pausedAt;
                goal.pausedTime += pauseDuration;
                goal.isPaused = false;
                goal.pausedAt = null;
            } else {
                // Pause
                goal.isPaused = true;
                goal.pausedAt = Date.now();
            }
            this.saveGoals();
            this.render();
        }
    }

    resetGoal(goalId) {
        const goal = this.goals.find(g => g.id === goalId);
        if (goal) {
            const time = this.calculateTimeElapsed(goal.startTime, goal.pausedTime, goal.isPaused, goal.pausedAt);
            const currentStreak = time.days;
            
            const confirmReset = confirm(`Reset streak for "${goal.name}"?\n\nCurrent streak: ${currentStreak} days\nBest streak: ${goal.bestStreak} days`);
            if (confirmReset) {
                // Update best streak if current is better
                if (currentStreak > goal.bestStreak) {
                    goal.bestStreak = currentStreak;
                }
                
                goal.startTime = Date.now();
                goal.pausedTime = 0;
                goal.isPaused = false;
                goal.pausedAt = null;
                this.saveGoals();
                this.render();
            }
        }
    }

    deleteGoal(goalId) {
        const goal = this.goals.find(g => g.id === goalId);
        if (goal) {
            const confirmDelete = confirm(`Delete "${goal.name}"?`);
            if (confirmDelete) {
                this.goals = this.goals.filter(g => g.id !== goalId);
                this.saveGoals();
                this.render();
            }
        }
    }

    calculateTimeElapsed(startTime, pausedTime = 0, isPaused = false, pausedAt = null) {
        const now = Date.now();
        let elapsed = now - startTime - pausedTime;
        
        // If currently paused, subtract the current pause duration
        if (isPaused && pausedAt) {
            elapsed -= (now - pausedAt);
        }
        
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        const remainingHours = hours % 24;
        const remainingMinutes = minutes % 60;
        const remainingSeconds = seconds % 60;

        return {
            days,
            hours: remainingHours,
            minutes: remainingMinutes,
            seconds: remainingSeconds,
            totalHours: hours,
            totalMinutes: minutes
        };
    }

    formatTime(value) {
        return value.toString().padStart(2, '0');
    }

    getStreakBadge(time) {
        const { days, totalHours, totalMinutes } = time;

        // Very granular for first 24 hours
        if (days === 0) {
            if (totalMinutes < 5) return {
                emoji: '🌱',
                text: 'Just Started!',
                class: 'new',
                message: 'Every journey begins with a single step! 🌟'
            };
            if (totalMinutes < 15) return {
                emoji: '🌿',
                text: '5+ Minutes!',
                class: 'new',
                message: 'Great momentum! Keep that energy flowing! 💫'
            };
            if (totalMinutes < 30) return {
                emoji: '🍀',
                text: '15+ Minutes!',
                class: 'new',
                message: 'You\'re building something amazing! 🌈'
            };
            if (totalHours < 1) return {
                emoji: '🌳',
                text: '30+ Minutes!',
                class: 'building',
                message: 'Half an hour of dedication! You\'re unstoppable! ⚡'
            };
            if (totalHours < 3) return {
                emoji: '💪',
                text: '1+ Hour!',
                class: 'building',
                message: 'An hour of focus! Your determination shines! ✨'
            };
            if (totalHours < 6) return {
                emoji: '💫',
                text: '3+ Hours!',
                class: 'building',
                message: 'Three hours of commitment! You\'re a force! 🚀'
            };
            if (totalHours < 12) return {
                emoji: '⭐',
                text: '6+ Hours!',
                class: 'building',
                message: 'Six hours of dedication! You\'re incredible! 🌟'
            };
            return {
                emoji: '✨',
                text: '12+ Hours!',
                class: 'strong',
                message: 'Half a day of consistency! You\'re amazing! 🎯'
            };
        }

        // Day-based milestones
        if (days === 1) return {
            emoji: '🎯',
            text: '1 Day!',
            class: 'strong',
            message: 'Your first full day! A beautiful beginning! 🌅'
        };
        if (days === 2) return {
            emoji: '🚀',
            text: '2 Days!',
            class: 'strong',
            message: 'Two days strong! Your momentum is building! 💪'
        };
        if (days === 3) return {
            emoji: '⚡',
            text: '3 Days!',
            class: 'strong',
            message: 'Three days of dedication! You\'re on fire! 🔥'
        };
        if (days < 7) return {
            emoji: '💎',
            text: `${days} Days!`,
            class: 'strong',
            message: `Day ${days} and still going! You\'re a diamond! 💎`
        };
        if (days === 7) return {
            emoji: '🌟',
            text: '1 Week!',
            class: 'strong',
            message: 'One full week! You\'re building real habits! 🌟'
        };
        if (days < 14) return {
            emoji: '🔥',
            text: `${days} Days!`,
            class: 'fire',
            message: `Day ${days} of your streak! Keep that fire burning! 🔥`
        };
        if (days === 14) return {
            emoji: '⚡',
            text: '2 Weeks!',
            class: 'fire',
            message: 'Two weeks of consistency! You\'re electric! ⚡'
        };
        if (days < 21) return {
            emoji: '💥',
            text: `${days} Days!`,
            class: 'fire',
            message: `Day ${days} - you\'re exploding with progress! 💥`
        };
        if (days === 21) return {
            emoji: '🎆',
            text: '3 Weeks!',
            class: 'fire',
            message: 'Three weeks! You\'re a celebration of consistency! 🎆'
        };
        if (days < 30) return {
            emoji: '🔥',
            text: `${days} Days!`,
            class: 'fire',
            message: `Day ${days} of your amazing streak! 🔥`
        };
        if (days === 30) return {
            emoji: '👑',
            text: '1 Month!',
            class: 'fire',
            message: 'One month of dedication! You\'re royalty! 👑'
        };
        if (days < 60) return {
            emoji: '🏅',
            text: `${days} Days!`,
            class: 'fire',
            message: `Day ${days} - you\'re earning your medal! 🏅`
        };
        if (days === 60) return {
            emoji: '🥈',
            text: '2 Months!',
            class: 'fire',
            message: 'Two months of excellence! Silver medal worthy! 🥈'
        };
        if (days < 100) return {
            emoji: '🏆',
            text: `${days} Days!`,
            class: 'fire',
            message: `Day ${days} - you\'re a champion in the making! 🏆`
        };
        if (days === 100) return {
            emoji: '💯',
            text: '100 Days!',
            class: 'fire',
            message: '100 DAYS! You\'re absolutely legendary! 💯'
        };
        if (days < 365) return {
            emoji: '👑',
            text: `${days} Days LEGEND!`,
            class: 'fire',
            message: `Day ${days} - you\'re a living legend! 👑`
        };
        return {
            emoji: '🌟',
            text: `${days} Days CHAMPION!`,
            class: 'fire',
            message: `Day ${days} - you\'re an eternal champion! 🌟`
        };
    }

    getNextMilestone(time) {
        const { days, totalMinutes } = time;
        
        // Hour-based milestones for first day
        if (days === 0) {
            const hourMilestones = [5, 15, 30, 60, 180, 360, 720, 1440]; // minutes
            for (let milestone of hourMilestones) {
                if (totalMinutes < milestone) {
                    const label = milestone < 60 ? `${milestone} min` : `${milestone / 60} hr`;
                    return { next: milestone, progress: (totalMinutes / milestone) * 100, label };
                }
            }
        }
        
        // Day-based milestones
        const dayMilestones = [1, 2, 3, 7, 14, 21, 30, 60, 100, 365];
        for (let milestone of dayMilestones) {
            if (days < milestone) {
                return { next: milestone, progress: (days / milestone) * 100, label: `${milestone} day${milestone > 1 ? 's' : ''}` };
            }
        }
        return { next: null, progress: 100, label: 'max' };
    }

    getMotivationalMessage(days) {
        const messages = [
            "You're doing amazing! 🌟",
            "Keep up the great work! 💪",
            "Every day counts! 🎯",
            "You've got this! 🚀",
            "Consistency is key! 🔑",
            "Stay strong! 💎",
            "You're unstoppable! ⚡",
            "One day at a time! 🌈",
            "You're on fire! 🔥",
            "Believe in yourself! ✨",
            "Progress over perfection! 🎨",
            "You're a champion! 🏆"
        ];
        
        if (days === 0) return "Great start! The first step is always the hardest! 🌱";
        if (days === 1) return "You made it one full day! Incredible! 🎉";
        if (days === 7) return "One full week! You're building a real habit! 🌟";
        if (days === 30) return "30 days! You're a habit-building machine! 👑";
        if (days === 100) return "100 DAYS! You're absolutely legendary! 💯";
        
        return messages[days % messages.length];
    }

    getColorGradient(color) {
        const colors = {
            gray: '#6b7280',
            blue: '#3b82f6',
            green: '#10b981',
            amber: '#f59e0b',
            rose: '#f43f5e',
            purple: '#8b5cf6'
        };
        return colors[color] || colors.gray;
    }

    getBorderColor(color) {
        const colors = {
            gray: '#6b7280',
            blue: '#3b82f6',
            green: '#10b981',
            amber: '#f59e0b',
            rose: '#f43f5e',
            purple: '#8b5cf6'
        };
        return colors[color] || colors.gray;
    }

    toggleNotes(goalId) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return;

        const card = document.querySelector(`[data-goal-id="${goalId}"]`);
        const existingNotes = card.querySelector('.goal-notes');

        if (existingNotes) {
            existingNotes.remove();
        } else {
            const notesDiv = document.createElement('div');
            notesDiv.className = 'goal-notes';
            notesDiv.innerHTML = goal.notes ? `
                <div class="note-display">"${goal.notes}"</div>
                <button class="edit-note-btn">✏️ Edit Note</button>
            ` : `
                <textarea placeholder="Add notes about your goal, feelings, or progress..."></textarea>
                <button class="save-note-btn">💾 Save Note</button>
            `;

            card.appendChild(notesDiv);

            const saveBtn = notesDiv.querySelector('.save-note-btn');
            const editBtn = notesDiv.querySelector('.edit-note-btn');

            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    const textarea = notesDiv.querySelector('textarea');
                    goal.notes = textarea.value.trim();
                    this.saveGoals();
                    this.toggleNotes(goalId);
                    this.toggleNotes(goalId);
                });
            }

            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    notesDiv.innerHTML = `
                        <textarea>${goal.notes}</textarea>
                        <button class="save-note-btn">💾 Save Note</button>
                    `;
                    notesDiv.querySelector('.save-note-btn').addEventListener('click', () => {
                        const textarea = notesDiv.querySelector('textarea');
                        goal.notes = textarea.value.trim();
                        this.saveGoals();
                        this.toggleNotes(goalId);
                        this.toggleNotes(goalId);
                    });
                });
            }
        }
    }

    toggleColorPicker(goalId) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return;

        const card = document.querySelector(`[data-goal-id="${goalId}"]`);
        const existingPicker = card.querySelector('.color-picker-inline');

        if (existingPicker) {
            existingPicker.remove();
        } else {
            const pickerDiv = document.createElement('div');
            pickerDiv.className = 'color-picker-inline';
            pickerDiv.innerHTML = `
                <div class="color-option-inline ${goal.color === 'gray' ? 'selected' : ''}" data-color="gray" style="background: #6b7280" title="Gray"></div>
                <div class="color-option-inline ${goal.color === 'blue' ? 'selected' : ''}" data-color="blue" style="background: #3b82f6" title="Blue"></div>
                <div class="color-option-inline ${goal.color === 'green' ? 'selected' : ''}" data-color="green" style="background: #10b981" title="Green"></div>
                <div class="color-option-inline ${goal.color === 'amber' ? 'selected' : ''}" data-color="amber" style="background: #f59e0b" title="Amber"></div>
                <div class="color-option-inline ${goal.color === 'rose' ? 'selected' : ''}" data-color="rose" style="background: #f43f5e" title="Rose"></div>
                <div class="color-option-inline ${goal.color === 'purple' ? 'selected' : ''}" data-color="purple" style="background: #8b5cf6" title="Purple"></div>
            `;

            card.appendChild(pickerDiv);

            pickerDiv.querySelectorAll('.color-option-inline').forEach(option => {
                option.addEventListener('click', (e) => {
                    const newColor = e.target.dataset.color;
                    this.changeGoalColor(goalId, newColor);
                    pickerDiv.remove();
                });
            });
        }
    }

    changeGoalColor(goalId, newColor) {
        const goal = this.goals.find(g => g.id === goalId);
        if (goal) {
            goal.color = newColor;
            this.saveGoals();
            this.render();
            this.playSound('success');
        }
    }

    createGoalCard(goal) {
        const time = this.calculateTimeElapsed(goal.startTime, goal.pausedTime, goal.isPaused, goal.pausedAt);
        const badge = this.getStreakBadge(time);
        const milestone = this.getNextMilestone(time);
        const motivationalMsg = badge.message || this.getMotivationalMessage(time.days);
        
        const card = document.createElement('div');
        card.className = goal.isPaused ? 'goal-card paused' : 'goal-card';
        card.setAttribute('data-goal-id', goal.id);
        card.style.borderLeftColor = this.getBorderColor(goal.color);
        
        let milestoneHTML = '';
        if (milestone.next !== null) {
            milestoneHTML = `
                <div class="progress-bar-container">
                    <div class="progress-bar">
                        <div class="progress-bar-fill" style="width: ${milestone.progress}%; background: ${this.getColorGradient(goal.color)}"></div>
                    </div>
                    <div class="milestone-text">Next: ${milestone.label} 🎯 (${Math.round(milestone.progress)}%)</div>
                </div>
            `;
        } else {
            milestoneHTML = `
                <div class="progress-bar-container">
                    <div class="milestone-text achieved">🎉 All milestones unlocked! Keep going! 🎉</div>
                </div>
            `;
        }
        
        const bestStreakHTML = goal.bestStreak > 0 ? `
            <div class="best-streak">🏆 Best Streak: ${goal.bestStreak} day${goal.bestStreak === 1 ? '' : 's'}</div>
        ` : '';
        
        card.innerHTML = `
            <div class="goal-header">
                <h3 class="goal-title">
                    ${this.escapeHtml(goal.name)}
                    <span class="streak-badge ${badge.class}">${badge.emoji} ${badge.text}</span>
                </h3>
                <div class="goal-actions">
                    <button class="btn-color" data-id="${goal.id}">🎨 Color</button>
                    <button class="btn-pause" data-id="${goal.id}">${goal.isPaused ? '▶️ Resume' : '⏸️ Pause'}</button>
                    <button class="btn-notes" data-id="${goal.id}">📝 Notes</button>
                    <button class="btn-reset" data-id="${goal.id}">🔄 Reset</button>
                    <button class="btn-delete" data-id="${goal.id}">🗑️ Delete</button>
                </div>
            </div>
            ${milestoneHTML}
            ${bestStreakHTML}
            <div class="goal-stats">
                <div class="stat-box">
                    <div class="stat-value">${time.days}</div>
                    <div class="stat-label">Days</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${this.formatTime(time.hours)}</div>
                    <div class="stat-label">Hours</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${this.formatTime(time.minutes)}</div>
                    <div class="stat-label">Minutes</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${this.formatTime(time.seconds)}</div>
                    <div class="stat-label">Seconds</div>
                </div>
            </div>
            <div class="motivational-message">${motivationalMsg}</div>
        `;

        // Add event listeners
        card.querySelector('.btn-color').addEventListener('click', () => {
            this.toggleColorPicker(goal.id);
        });

        card.querySelector('.btn-pause').addEventListener('click', () => {
            this.pauseGoal(goal.id);
        });

        card.querySelector('.btn-notes').addEventListener('click', () => {
            this.toggleNotes(goal.id);
        });

        card.querySelector('.btn-reset').addEventListener('click', () => {
            this.resetGoal(goal.id);
        });

        card.querySelector('.btn-delete').addEventListener('click', () => {
            this.deleteGoal(goal.id);
        });

        return card;
    }

    updateOverallStats() {
        if (this.goals.length === 0) {
            this.statsOverview.classList.add('hidden');
            return;
        }

        this.statsOverview.classList.remove('hidden');
        
        let totalDays = 0;
        let longestStreak = 0;
        let activeGoals = 0;
        
        this.goals.forEach(goal => {
            const time = this.calculateTimeElapsed(goal.startTime, goal.pausedTime, goal.isPaused, goal.pausedAt);
            totalDays += time.days;
            if (time.days > longestStreak) longestStreak = time.days;
            if (!goal.isPaused) activeGoals++;
        });
        
        const titleColor = this.darkMode ? '#f3f4f6' : '#374151';
        this.statsOverview.innerHTML = `
            <h3 style="margin-bottom: 10px; color: ${titleColor};">📊 Your Overall Progress</h3>
            <div class="stats-grid">
                <div class="overall-stat">
                    <div class="overall-stat-value">${this.goals.length}</div>
                    <div class="overall-stat-label">Total Goals</div>
                </div>
                <div class="overall-stat">
                    <div class="overall-stat-value">${activeGoals}</div>
                    <div class="overall-stat-label">Active</div>
                </div>
                <div class="overall-stat">
                    <div class="overall-stat-value">${totalDays}</div>
                    <div class="overall-stat-label">Total Days</div>
                </div>
                <div class="overall-stat">
                    <div class="overall-stat-value">${longestStreak}</div>
                    <div class="overall-stat-label">Longest Streak</div>
                </div>
            </div>
        `;
    }

    sortGoals() {
        switch(this.sortBy) {
            case 'newest':
                this.goals.sort((a, b) => b.id - a.id);
                break;
            case 'oldest':
                this.goals.sort((a, b) => a.id - b.id);
                break;
            case 'longest':
                this.goals.sort((a, b) => {
                    const timeA = this.calculateTimeElapsed(a.startTime, a.pausedTime, a.isPaused, a.pausedAt);
                    const timeB = this.calculateTimeElapsed(b.startTime, b.pausedTime, b.isPaused, b.pausedAt);
                    return timeB.days - timeA.days;
                });
                break;
            case 'shortest':
                this.goals.sort((a, b) => {
                    const timeA = this.calculateTimeElapsed(a.startTime, a.pausedTime, a.isPaused, a.pausedAt);
                    const timeB = this.calculateTimeElapsed(b.startTime, b.pausedTime, b.isPaused, b.pausedAt);
                    return timeA.days - timeB.days;
                });
                break;
        }
    }

    render() {
        this.goalsContainer.innerHTML = '';
        this.updateOverallStats();

        if (this.goals.length === 0) {
            this.emptyState.classList.remove('hidden');
            return;
        }

        this.emptyState.classList.add('hidden');
        
        this.sortGoals();

        this.goals.forEach(goal => {
            const card = this.createGoalCard(goal);
            this.goalsContainer.appendChild(card);
        });
    }

    showCelebration(emoji) {
        const celebration = document.createElement('div');
        celebration.className = 'celebration';
        celebration.textContent = emoji;
        document.body.appendChild(celebration);
        
        setTimeout(() => {
            celebration.remove();
        }, 1000);
    }

    updateTimes() {
        // Only update the time values, not the entire DOM
        this.goals.forEach(goal => {
            const time = this.calculateTimeElapsed(goal.startTime, goal.pausedTime, goal.isPaused, goal.pausedAt);
            const card = document.querySelector(`[data-goal-id="${goal.id}"]`);
            
            if (card) {
                const statValues = card.querySelectorAll('.stat-value');
                if (statValues.length === 4) {
                    const oldDays = parseInt(statValues[0].textContent);
                    statValues[0].textContent = time.days;
                    statValues[1].textContent = this.formatTime(time.hours);
                    statValues[2].textContent = this.formatTime(time.minutes);
                    statValues[3].textContent = this.formatTime(time.seconds);
                    
                    // Check for milestone achievements and show celebration
                    if (time.days > oldDays && !isNaN(oldDays) && !goal.isPaused) {
                        const milestones = [1, 2, 3, 7, 14, 21, 30, 60, 100, 365];
                        if (milestones.includes(time.days)) {
                            this.showCelebration('🎉🎊🏆');
                            this.playSound('milestone');
                        }
                    }
                    
                    // Update progress bar
                    const milestone = this.getNextMilestone(time);
                    const progressFill = card.querySelector('.progress-bar-fill');
                    const milestoneText = card.querySelector('.milestone-text');
                    
                    if (progressFill && milestone.next !== null) {
                        progressFill.style.width = `${milestone.progress}%`;
                        milestoneText.textContent = `Next: ${milestone.label} 🎯 (${Math.round(milestone.progress)}%)`;
                    }
                    
                    // Update badge
                    const badge = this.getStreakBadge(time);
                    const streakBadge = card.querySelector('.streak-badge');
                    if (streakBadge) {
                        streakBadge.className = `streak-badge ${badge.class}`;
                        streakBadge.textContent = `${badge.emoji} ${badge.text}`;
                    }

                    // Update motivational message if it exists
                    const motivationalElement = card.querySelector('.motivational-message');
                    if (motivationalElement) {
                        motivationalElement.textContent = badge.message || 'Keep going! You\'re doing great! 🌟';
                    }
                }
            }
        });
        
        // Update overall stats
        this.updateOverallStats();
    }

    startUpdateInterval() {
        // Update only the time values every second
        setInterval(() => {
            if (this.goals.length > 0) {
                this.updateTimes();
            }
        }, 1000);
    }

    saveGoals() {
        localStorage.setItem('goalTrackerData', JSON.stringify(this.goals));
    }

    loadGoals() {
        const saved = localStorage.getItem('goalTrackerData');
        const goals = saved ? JSON.parse(saved) : [];

        // Ensure existing goals have a color property
        goals.forEach(goal => {
            if (!goal.color) {
                goal.color = 'gray'; // Default color for existing goals
            }
        });

        return goals;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GoalTracker();
});

