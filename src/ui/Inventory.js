import { BLOCKS, BLOCK_DATA } from '../world/Blocks.js';

export class Inventory {
    constructor(engine) {
        this.engine = engine;
        
        // 36 slots: 0-8 is Hotbar, 9-35 is Main Inventory
        this.slots = new Array(36).fill(null).map(() => ({ id: 0, count: 0 }));
        
        // Initial Items for testing
        this.slots[0] = { id: BLOCKS.DIRT, count: 64 };
        this.slots[1] = { id: BLOCKS.STONE, count: 64 };
        this.slots[2] = { id: BLOCKS.WOOD, count: 64 };
        this.slots[3] = { id: BLOCKS.PLANKS, count: 64 };
        this.slots[4] = { id: BLOCKS.CRAFTING_TABLE, count: 64 };
        
        this.activeHotbarSlot = 0;
        
        this.draggedItem = null;
        this.dragSourceSlot = -1;

        this.initUI();
    }

    initUI() {
        const grid = document.getElementById('inventory-grid');
        const hotbarGrid = document.getElementById('inventory-hotbar');
        const mainHotbar = document.querySelector('.hotbar-slots');

        grid.innerHTML = '';
        hotbarGrid.innerHTML = '';
        mainHotbar.innerHTML = '';

        for (let i = 0; i < 36; i++) {
            const el = document.createElement('div');
            el.className = 'slot';
            el.dataset.index = i;
            
            this.setupDragEvents(el, i);

            if (i < 9) {
                hotbarGrid.appendChild(el);
                
                // Duplicate for main HUD hotbar
                const hudEl = document.createElement('div');
                hudEl.className = 'slot';
                if (i === this.activeHotbarSlot) hudEl.classList.add('active');
                mainHotbar.appendChild(hudEl);
            } else {
                grid.appendChild(el);
            }
        }

        this.updateUI();

        // Hotbar selection
        window.addEventListener('keydown', (e) => {
            if (e.key >= '1' && e.key <= '9') {
                this.activeHotbarSlot = parseInt(e.key) - 1;
                this.updateUI();
                
                // Update player's selected block
                const item = this.slots[this.activeHotbarSlot];
                this.engine.player.selectedBlockId = item.id;
            }
        });
    }

    setupDragEvents(el, index) {
        // We use pointer events for custom drag logic to support both touch and mouse
        el.addEventListener('pointerdown', (e) => {
            const item = this.slots[index];
            if (item.id !== 0) {
                this.draggedItem = { ...item };
                this.dragSourceSlot = index;
                this.slots[index] = { id: 0, count: 0 };
                this.updateUI();
                
                // Visual feedback could be added here (e.g., following cursor)
            }
        });

        el.addEventListener('pointerup', (e) => {
            if (this.draggedItem) {
                // Drop on this slot
                const currentItem = this.slots[index];
                
                if (currentItem.id === 0) {
                    this.slots[index] = this.draggedItem;
                } else if (currentItem.id === this.draggedItem.id) {
                    this.slots[index].count += this.draggedItem.count;
                    // Cap at 64, leftover goes back to source or drops
                    if (this.slots[index].count > 64) {
                        this.draggedItem.count = this.slots[index].count - 64;
                        this.slots[index].count = 64;
                        this.slots[this.dragSourceSlot] = this.draggedItem;
                    }
                } else {
                    // Swap
                    this.slots[this.dragSourceSlot] = currentItem;
                    this.slots[index] = this.draggedItem;
                }
                
                this.draggedItem = null;
                this.dragSourceSlot = -1;
                this.updateUI();
                
                // Sync hotbar to player selected block
                this.engine.player.selectedBlockId = this.slots[this.activeHotbarSlot].id;
            }
        });
    }

    updateUI() {
        const uiSlots = document.querySelectorAll('#inventory-grid .slot, #inventory-hotbar .slot');
        const hudSlots = document.querySelectorAll('#hotbar-container .slot');

        for (let i = 0; i < 36; i++) {
            const item = this.slots[i];
            const slotEl = document.querySelector(`.slot[data-index="${i}"]`);
            
            const updateElement = (el) => {
                if (item.id !== 0) {
                    el.style.backgroundColor = BLOCK_DATA[item.id].color;
                    el.innerText = item.count > 1 ? item.count : '';
                } else {
                    el.style.backgroundColor = 'transparent';
                    el.innerText = '';
                }
            };
            
            if (slotEl) updateElement(slotEl);

            if (i < 9) {
                const hudEl = hudSlots[i];
                if (hudEl) {
                    updateElement(hudEl);
                    if (i === this.activeHotbarSlot) {
                        hudEl.classList.add('active');
                    } else {
                        hudEl.classList.remove('active');
                    }
                }
            }
        }
    }
}
