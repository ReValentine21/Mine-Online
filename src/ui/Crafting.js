import { BLOCKS } from '../world/Blocks.js';

export class Crafting {
    constructor(inventory) {
        this.inventory = inventory;
        
        // 2x2 grid for now (can be expanded to 3x3 if interacting with a table)
        this.gridSize = 2; 
        this.grid = new Array(9).fill(null).map(() => ({ id: 0, count: 0 }));
        this.output = { id: 0, count: 0 };

        // Recipes array: pattern, width, height, result, resultCount
        this.recipes = [
            {
                pattern: [BLOCKS.WOOD],
                width: 1, height: 1,
                result: BLOCKS.PLANKS, count: 4
            },
            {
                pattern: [
                    BLOCKS.PLANKS, BLOCKS.PLANKS,
                    BLOCKS.PLANKS, BLOCKS.PLANKS
                ],
                width: 2, height: 2,
                result: BLOCKS.CRAFTING_TABLE, count: 1
            }
            // Add more recipes here for Pickaxes, Swords etc.
        ];

        this.initUI();
    }

    initUI() {
        const gridEl = document.getElementById('crafting-grid');
        gridEl.innerHTML = '';
        
        // Render 2x2
        for (let i = 0; i < 4; i++) {
            const el = document.createElement('div');
            el.className = 'slot';
            el.dataset.craftIndex = i;
            this.setupDragEvents(el, i);
            gridEl.appendChild(el);
        }

        const outEl = document.getElementById('crafting-output');
        outEl.addEventListener('pointerdown', () => this.craft());
    }

    setupDragEvents(el, index) {
        el.addEventListener('pointerdown', () => {
            const item = this.grid[index];
            if (item.id !== 0) {
                this.inventory.draggedItem = { ...item };
                this.grid[index] = { id: 0, count: 0 };
                this.checkRecipes();
                this.updateUI();
            }
        });

        el.addEventListener('pointerup', () => {
            if (this.inventory.draggedItem) {
                const currentItem = this.grid[index];
                if (currentItem.id === 0) {
                    this.grid[index] = this.inventory.draggedItem;
                    this.inventory.draggedItem = null;
                }
                this.checkRecipes();
                this.updateUI();
            }
        });
    }

    checkRecipes() {
        this.output = { id: 0, count: 0 };

        // Simplify matching for 2x2
        // Just extract non-zero blocks into a pattern
        const currentPattern = [];
        let minX = 2, minY = 2, maxX = -1, maxY = -1;

        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const item = this.grid[y * this.gridSize + x];
                if (item && item.id !== 0) {
                    if (x < minX) minX = x;
                    if (y < minY) minY = y;
                    if (x > maxX) maxX = x;
                    if (y > maxY) maxY = y;
                }
            }
        }

        if (minX > maxX) {
            this.updateUI();
            return; // Empty grid
        }

        const w = maxX - minX + 1;
        const h = maxY - minY + 1;

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                currentPattern.push(this.grid[y * this.gridSize + x].id);
            }
        }

        // Match against recipes
        for (const r of this.recipes) {
            if (r.width === w && r.height === h) {
                let match = true;
                for (let i = 0; i < currentPattern.length; i++) {
                    if (currentPattern[i] !== r.pattern[i]) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    this.output = { id: r.result, count: r.count };
                    break;
                }
            }
        }
        
        this.updateUI();
    }

    craft() {
        if (this.output.id !== 0) {
            // Attempt to add to inventory or attach to drag
            if (!this.inventory.draggedItem) {
                this.inventory.draggedItem = { ...this.output };
                
                // Decrement materials
                for (let i = 0; i < 4; i++) {
                    if (this.grid[i].count > 0) {
                        this.grid[i].count--;
                        if (this.grid[i].count === 0) this.grid[i].id = 0;
                    }
                }
                this.checkRecipes();
            }
        }
    }

    updateUI() {
        const outEl = document.getElementById('crafting-output');
        if (this.output.id !== 0) {
            outEl.style.backgroundColor = 'white'; // Represent filled output
            outEl.innerText = this.output.count;
        } else {
            outEl.style.backgroundColor = 'transparent';
            outEl.innerText = '';
        }

        for (let i = 0; i < 4; i++) {
            const el = document.querySelector(`.slot[data-craft-index="${i}"]`);
            const item = this.grid[i];
            if (item && item.id !== 0) {
                el.style.backgroundColor = 'gray'; // Visual placeholder
                el.innerText = item.count;
            } else {
                el.style.backgroundColor = 'transparent';
                el.innerText = '';
            }
        }
    }
}
