// UK Democracy Simulator - JavaScript

class UKDemocracySimulator {
    constructor() {
        this.gameState = {
            currentDate: new Date(2025, 5, 1), // June 2025
            electionDate: new Date(2029, 7, 1), // August 2029
            politicalCapital: 75,
            approvalRating: 42,
            turnNumber: 1,
            emergencyPowers: false,
            honeymoonPeriod: true, // First 12 months
            policies: {
                nhsFunding: 50,
                socialCare: 40,
                schoolFunding: 55,
                higherEd: 45,
                incomeTax: 20,
                corporationTax: 25,
                policeFunding: 60,
                immigration: 30
            },
            voterApproval: {
                'Labour Supporters': 75,
                'Conservative Supporters': 18,
                'LibDem Supporters': 45,
                'Reform Supporters': 12,
                'Green Supporters': 55,
                'Floating Voters': 38
            },
            regionalSupport: {
                'Scotland': 35,
                'Northern England': 52,
                'Midlands': 48,
                'Wales': 45,
                'London': 58,
                'South': 38
            },
            performanceMetrics: {
                nhsWaitingTimes: 18,
                educationStandards: 'Good',
                crimeRate: 'Stable',
                gdpGrowth: 2.1,
                unemployment: 4.2,
                climateProgress: 'Behind Target'
            },
            cabinetLoyalty: {
                'Wes Streeting': 'Loyal',
                'Rachel Reeves': 'Loyal',
                'Yvette Cooper': 'Neutral'
            },
            implementationQueue: [
                {
                    policy: 'NHS Funding Increase',
                    progress: 60,
                    monthsRemaining: 2,
                    effect: { nhsWaitingTimes: -2, voterGroup: 'Labour Supporters', impact: 5 }
                }
            ],
            events: [
                {
                    title: 'NHS Winter Pressures',
                    description: 'Hospital waiting times reach record highs amid staff shortages',
                    impact: 'Health approval -5%',
                    effects: { performanceMetrics: { nhsWaitingTimes: 2 }, voterApproval: { 'Labour Supporters': -5 } }
                },
                {
                    title: 'Economic Growth',
                    description: 'GDP growth exceeds expectations at 2.1%',
                    impact: 'Overall approval +3%',
                    effects: { approvalRating: 3, performanceMetrics: { gdpGrowth: 0.3 } }
                }
            ]
        };

        this.policyEffects = {
            nhsFunding: {
                cost: 8,
                effects: {
                    'Labour Supporters': 0.8,
                    'Conservative Supporters': -0.3,
                    'LibDem Supporters': 0.5,
                    'Green Supporters': 0.4,
                    'Floating Voters': 0.6
                },
                metrics: { nhsWaitingTimes: -0.2 }
            },
            socialCare: {
                cost: 6,
                effects: {
                    'Labour Supporters': 0.6,
                    'Conservative Supporters': -0.2,
                    'LibDem Supporters': 0.4,
                    'Floating Voters': 0.3
                }
            },
            schoolFunding: {
                cost: 7,
                effects: {
                    'Labour Supporters': 0.7,
                    'Conservative Supporters': -0.1,
                    'LibDem Supporters': 0.6,
                    'Green Supporters': 0.5,
                    'Floating Voters': 0.4
                },
                metrics: { educationStandards: 0.1 }
            },
            higherEd: {
                cost: 5,
                effects: {
                    'LibDem Supporters': 0.8,
                    'Labour Supporters': 0.4,
                    'Green Supporters': 0.3,
                    'Floating Voters': 0.2
                }
            },
            incomeTax: {
                cost: 12,
                effects: {
                    'Conservative Supporters': function(value) { return value < 25 ? 0.8 : -0.8; },
                    'Labour Supporters': function(value) { return value > 30 ? 0.6 : -0.4; },
                    'LibDem Supporters': function(value) { return value > 25 && value < 35 ? 0.4 : -0.2; },
                    'Reform Supporters': function(value) { return value < 20 ? 0.6 : -0.6; },
                    'Floating Voters': function(value) { return value > 20 && value < 30 ? 0.3 : -0.3; }
                }
            },
            corporationTax: {
                cost: 10,
                effects: {
                    'Conservative Supporters': function(value) { return value < 20 ? 0.9 : -0.7; },
                    'Labour Supporters': function(value) { return value > 25 ? 0.5 : -0.3; },
                    'LibDem Supporters': function(value) { return value > 22 && value < 30 ? 0.4 : -0.2; },
                    'Green Supporters': function(value) { return value > 28 ? 0.6 : -0.2; }
                }
            },
            policeFunding: {
                cost: 8,
                effects: {
                    'Conservative Supporters': 0.7,
                    'Reform Supporters': 0.6,
                    'Labour Supporters': 0.3,
                    'LibDem Supporters': 0.2,
                    'Floating Voters': 0.5
                },
                metrics: { crimeRate: -0.1 }
            },
            immigration: {
                cost: 15,
                effects: {
                    'Reform Supporters': function(value) { return value > 60 ? 1.2 : -0.8; },
                    'Conservative Supporters': function(value) { return value > 50 ? 0.8 : -0.4; },
                    'Labour Supporters': function(value) { return value < 40 ? 0.4 : -0.6; },
                    'LibDem Supporters': function(value) { return value < 30 ? 0.6 : -0.4; },
                    'Green Supporters': function(value) { return value < 25 ? 0.5 : -0.5; }
                }
            }
        };

        this.randomEvents = [
            {
                title: 'NHS Strike Action',
                description: 'Junior doctors announce strike over pay and conditions',
                probability: 0.15,
                effects: { 
                    performanceMetrics: { nhsWaitingTimes: 3 },
                    voterApproval: { 'Labour Supporters': -8, 'Conservative Supporters': 3 }
                }
            },
            {
                title: 'Economic Boom',
                description: 'Unexpected surge in economic growth boosts government popularity',
                probability: 0.1,
                effects: {
                    approvalRating: 8,
                    performanceMetrics: { gdpGrowth: 0.5, unemployment: -0.3 }
                }
            },
            {
                title: 'Climate Protests',
                description: 'Large-scale environmental protests demand faster climate action',
                probability: 0.12,
                effects: {
                    voterApproval: { 'Green Supporters': -10, 'LibDem Supporters': -5, 'Floating Voters': -3 }
                }
            },
            {
                title: 'Immigration Crisis',
                description: 'Sharp increase in small boat crossings strains border resources',
                probability: 0.18,
                effects: {
                    voterApproval: { 'Reform Supporters': -15, 'Conservative Supporters': -8, 'Floating Voters': -5 }
                }
            },
            {
                title: 'International Trade Deal',
                description: 'Successful conclusion of major trade agreement',
                probability: 0.08,
                effects: {
                    approvalRating: 5,
                    performanceMetrics: { gdpGrowth: 0.3 },
                    voterApproval: { 'Conservative Supporters': 5, 'Floating Voters': 6 }
                }
            }
        ];

        this.init();
    }

    init() {
        this.updateDisplay();
        this.bindEvents();
        this.updatePolicyCosts();
    }

    bindEvents() {
        // Next turn button
        document.getElementById('nextTurnBtn').addEventListener('click', () => {
            this.nextTurn();
        });

        // Policy sliders
        const sliders = document.querySelectorAll('.policy-slider');
        sliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                this.updatePolicyValue(e.target.id, e.target.value);
            });
        });

        // Region hover effects
        const regions = document.querySelectorAll('.region');
        regions.forEach(region => {
            region.addEventListener('click', (e) => {
                this.showRegionDetails(e.target.dataset.region);
            });
        });
    }

    updatePolicyValue(policyId, value) {
        const valueSpan = document.querySelector(`#${policyId}`).parentNode.querySelector('.policy-value');
        
        switch(policyId) {
            case 'nhsFunding':
                valueSpan.textContent = `£${(215.6 + (value - 50) * 2).toFixed(1)}bn`;
                break;
            case 'socialCare':
                valueSpan.textContent = value < 33 ? 'Low' : value < 66 ? 'Medium' : 'High';
                break;
            case 'schoolFunding':
                valueSpan.textContent = `£${(59.6 + (value - 55) * 1.5).toFixed(1)}bn`;
                break;
            case 'higherEd':
                valueSpan.textContent = value < 33 ? 'Low' : value < 66 ? 'Medium' : 'High';
                break;
            case 'incomeTax':
                valueSpan.textContent = `${value}%`;
                break;
            case 'corporationTax':
                valueSpan.textContent = `${value}%`;
                break;
            case 'policeFunding':
                valueSpan.textContent = value < 33 ? 'Low' : value < 66 ? 'Medium' : 'High';
                break;
            case 'immigration':
                valueSpan.textContent = value < 33 ? 'Liberal' : value < 66 ? 'Moderate' : 'Strict';
                break;
        }

        // Don't modify the actual policy values yet.  The change will be
        // processed at the start of the next turn so we can deduct
        // Political Capital correctly.  Only update the displayed cost/values.
        this.updatePolicyCosts();
    }

    updatePolicyCosts() {
        const sliders = document.querySelectorAll('.policy-slider');
        sliders.forEach(slider => {
            const policyId = slider.id;
            const costSpan = slider.parentNode.querySelector('.policy-cost');
            const baseCost = this.policyEffects[policyId]?.cost || 5;
            
            // Calculate cost based on how much change from current position
            const currentValue = this.gameState.policies[policyId];
            const newValue = parseInt(slider.value);
            const change = Math.abs(newValue - currentValue);
            const cost = Math.ceil(baseCost * (change / 25)); // Scale cost by magnitude of change
            
            costSpan.textContent = `Cost: ${cost} PC`;
        });
    }

    nextTurn() {
        // Advance date by one month
        this.gameState.currentDate.setMonth(this.gameState.currentDate.getMonth() + 1);
        this.gameState.turnNumber++;

        // Check if honeymoon period is over (12 months)
        if (this.gameState.turnNumber > 12) {
            this.gameState.honeymoonPeriod = false;
        }

        // Process policy changes
        this.processPolicyChanges();

        // Update implementation queue
        this.updateImplementationQueue();

        // Generate random events
        this.generateRandomEvents();

        // Recalculate approval ratings
        this.recalculateApproval();

        // Update performance metrics
        this.updatePerformanceMetrics();

        // Generate political capital
        this.generatePoliticalCapital();

        // Update display
        this.updateDisplay();

        // Recalculate cost labels for new baseline values
        this.updatePolicyCosts();

        // Check for special conditions
        this.checkSpecialConditions();
    }

    processPolicyChanges() {
        const sliders = document.querySelectorAll('.policy-slider');
        
        sliders.forEach(slider => {
            const policyId = slider.id;
            const currentValue = this.gameState.policies[policyId];
            const newValue = parseInt(slider.value);
            
            if (currentValue !== newValue) {
                const change = Math.abs(newValue - currentValue);
                const baseCost = this.policyEffects[policyId]?.cost || 5;
                const cost = Math.ceil(baseCost * (change / 25));
                
                if (this.gameState.politicalCapital >= cost) {
                    this.gameState.politicalCapital -= cost;
                    this.gameState.policies[policyId] = newValue;
                    
                    // Add to implementation queue
                    this.addToImplementationQueue(policyId, newValue, change);
                } else {
                    // Revert slider if not enough PC and refresh displayed value
                    slider.value = currentValue;
                    this.updatePolicyValue(policyId, currentValue);
                    this.showMessage('Not enough Political Capital for this change!', 'error');
                }
            }
        });
    }

    addToImplementationQueue(policyId, value, change) {
        const policyNames = {
            nhsFunding: 'NHS Funding',
            socialCare: 'Social Care',
            schoolFunding: 'School Funding',
            higherEd: 'Higher Education',
            incomeTax: 'Income Tax',
            corporationTax: 'Corporation Tax',
            policeFunding: 'Police Funding',
            immigration: 'Immigration Policy'
        };

        const implementationTime = Math.ceil(change / 10) + 1; // 1-4 months based on change magnitude

        this.gameState.implementationQueue.push({
            policy: policyNames[policyId],
            progress: 0,
            monthsRemaining: implementationTime,
            policyId: policyId,
            targetValue: value,
            effect: this.calculatePolicyEffect(policyId, value)
        });
    }

    updateImplementationQueue() {
        this.gameState.implementationQueue.forEach((item, index) => {
            item.monthsRemaining--;
            item.progress = Math.round(((item.monthsRemaining <= 0 ? 1 : (1 - item.monthsRemaining / (item.monthsRemaining + 1))) * 100));

            if (item.monthsRemaining <= 0) {
                // Policy implemented - apply effects
                this.applyPolicyEffect(item.effect);
                this.gameState.implementationQueue.splice(index, 1);
            }
        });
    }

    calculatePolicyEffect(policyId, value) {
        const effects = this.policyEffects[policyId];
        if (!effects) return {};

        const result = { voterApproval: {}, metrics: {} };

        // Calculate voter approval effects
        if (effects.effects) {
            Object.keys(effects.effects).forEach(voterGroup => {
                const effect = effects.effects[voterGroup];
                if (typeof effect === 'function') {
                    result.voterApproval[voterGroup] = effect(value);
                } else {
                    result.voterApproval[voterGroup] = effect * (value / 50); // Scale by policy level
                }
            });
        }

        // Calculate metric effects
        if (effects.metrics) {
            result.metrics = { ...effects.metrics };
        }

        return result;
    }

    applyPolicyEffect(effect) {
        // Apply voter approval changes
        if (effect.voterApproval) {
            Object.keys(effect.voterApproval).forEach(group => {
                this.gameState.voterApproval[group] = Math.max(0, Math.min(100, 
                    this.gameState.voterApproval[group] + effect.voterApproval[group]));
            });
        }

        // Apply metric changes
        if (effect.metrics) {
            Object.keys(effect.metrics).forEach(metric => {
                if (typeof this.gameState.performanceMetrics[metric] === 'number') {
                    this.gameState.performanceMetrics[metric] += effect.metrics[metric];
                }
            });
        }
    }

    generateRandomEvents() {
        if (Math.random() < 0.3) { // 30% chance of event each turn
            const eligibleEvents = this.randomEvents.filter(event => Math.random() < event.probability);
            
            if (eligibleEvents.length > 0) {
                const event = eligibleEvents[Math.floor(Math.random() * eligibleEvents.length)];
                this.gameState.events.unshift(event);
                
                // Apply event effects
                if (event.effects.approvalRating) {
                    this.gameState.approvalRating += event.effects.approvalRating;
                }
                
                if (event.effects.voterApproval) {
                    Object.keys(event.effects.voterApproval).forEach(group => {
                        this.gameState.voterApproval[group] = Math.max(0, Math.min(100,
                            this.gameState.voterApproval[group] + event.effects.voterApproval[group]));
                    });
                }
                
                if (event.effects.performanceMetrics) {
                    Object.keys(event.effects.performanceMetrics).forEach(metric => {
                        if (typeof this.gameState.performanceMetrics[metric] === 'number') {
                            this.gameState.performanceMetrics[metric] += event.effects.performanceMetrics[metric];
                        }
                    });
                }

                // Keep only last 5 events
                if (this.gameState.events.length > 5) {
                    this.gameState.events = this.gameState.events.slice(0, 5);
                }
            }
        }
    }

    recalculateApproval() {
        // Calculate weighted average of voter group approvals
        const voterGroups = {
            'Labour Supporters': 34,
            'Conservative Supporters': 24,
            'LibDem Supporters': 12,
            'Reform Supporters': 14,
            'Green Supporters': 7,
            'Floating Voters': 9
        };

        let totalApproval = 0;
        let totalWeight = 0;

        Object.keys(voterGroups).forEach(group => {
            const weight = voterGroups[group];
            const approval = this.gameState.voterApproval[group];
            totalApproval += approval * weight;
            totalWeight += weight;
        });

        this.gameState.approvalRating = Math.round(totalApproval / totalWeight);

        // Update regional support based on voter groups
        this.updateRegionalSupport();
    }

    updateRegionalSupport() {
        // Simplified regional calculations - each region has different voter compositions
        const regionalFactors = {
            'Scotland': { base: 35, volatility: 0.8 },
            'Northern England': { base: 52, volatility: 0.6 },
            'Midlands': { base: 48, volatility: 0.7 },
            'Wales': { base: 45, volatility: 0.5 },
            'London': { base: 58, volatility: 0.4 },
            'South': { base: 38, volatility: 0.9 }
        };

        Object.keys(regionalFactors).forEach(region => {
            const factor = regionalFactors[region];
            const change = (this.gameState.approvalRating - 42) * factor.volatility;
            this.gameState.regionalSupport[region] = Math.max(15, Math.min(75, 
                factor.base + change + (Math.random() - 0.5) * 3));
        });
    }

    updatePerformanceMetrics() {
        // Natural drift and policy effects
        this.gameState.performanceMetrics.nhsWaitingTimes = Math.max(12, Math.min(30, 
            this.gameState.performanceMetrics.nhsWaitingTimes + (Math.random() - 0.4)));
        
        this.gameState.performanceMetrics.gdpGrowth = Math.max(-2, Math.min(5,
            this.gameState.performanceMetrics.gdpGrowth + (Math.random() - 0.5) * 0.5));
        
        this.gameState.performanceMetrics.unemployment = Math.max(2, Math.min(12,
            this.gameState.performanceMetrics.unemployment + (Math.random() - 0.5) * 0.3));
    }

    generatePoliticalCapital() {
        let baseGeneration = 8;
        
        // Approval rating bonus/penalty
        if (this.gameState.approvalRating > 50) {
            baseGeneration += Math.floor((this.gameState.approvalRating - 50) / 10);
        } else if (this.gameState.approvalRating < 40) {
            baseGeneration -= Math.floor((40 - this.gameState.approvalRating) / 10);
        }

        // Honeymoon period bonus
        if (this.gameState.honeymoonPeriod) {
            baseGeneration = Math.floor(baseGeneration * 1.25);
        }

        // Cabinet loyalty bonus
        const loyalMinisters = Object.values(this.gameState.cabinetLoyalty).filter(loyalty => loyalty === 'Loyal').length;
        baseGeneration += loyalMinisters * 0.5;

        // Emergency powers bonus
        if (this.gameState.emergencyPowers) {
            baseGeneration = Math.floor(baseGeneration * 1.5);
        }

        this.gameState.politicalCapital = Math.min(150, this.gameState.politicalCapital + baseGeneration);
    }

    checkSpecialConditions() {
        // Check for vote of no confidence
        if (this.gameState.approvalRating < 25 && Math.random() < 0.1) {
            this.showMessage('Your government faces a vote of no confidence!', 'error');
            this.gameState.emergencyPowers = true;
        }

        // Check for early election calls
        if (this.gameState.approvalRating > 60 && this.gameState.turnNumber > 24 && Math.random() < 0.05) {
            this.showMessage('Consider calling an early election while popularity is high!', 'info');
        }
    }

    updateDisplay() {
        // Update header information
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
        document.getElementById('currentDate').textContent = 
            `${months[this.gameState.currentDate.getMonth()]} ${this.gameState.currentDate.getFullYear()}`;

        const monthsToElection = this.calculateMonthsToElection();
        document.getElementById('electionCountdown').textContent = `${monthsToElection} months`;

        document.getElementById('approvalRating').textContent = `${this.gameState.approvalRating}%`;
        document.getElementById('politicalCapital').textContent = this.gameState.politicalCapital;

        // Update voter approval bars
        Object.keys(this.gameState.voterApproval).forEach(group => {
            const approval = this.gameState.voterApproval[group];
            const groupElement = Array.from(document.querySelectorAll('.voter-group')).find(el => 
                el.querySelector('.group-name').textContent.includes(group));
            
            if (groupElement) {
                const fill = groupElement.querySelector('.approval-fill');
                const text = groupElement.querySelector('.approval-text');
                fill.style.width = `${approval}%`;
                text.textContent = `${Math.round(approval)}%`;
            }
        });

        // Update regional support
        Object.keys(this.gameState.regionalSupport).forEach(region => {
            const support = Math.round(this.gameState.regionalSupport[region]);
            const regionElement = document.querySelector(`[data-region="${region}"]`);
            if (regionElement) {
                regionElement.querySelector('.support-level').textContent = `${support}%`;
            }
        });

        // Update performance metrics
        document.querySelector('.metric-item:nth-child(1) .metric-value').textContent = 
            `${Math.round(this.gameState.performanceMetrics.nhsWaitingTimes)} weeks`;
        document.querySelector('.metric-item:nth-child(4) .metric-value').textContent = 
            `${this.gameState.performanceMetrics.gdpGrowth.toFixed(1)}%`;
        document.querySelector('.metric-item:nth-child(5) .metric-value').textContent = 
            `${this.gameState.performanceMetrics.unemployment.toFixed(1)}%`;

        // Update events
        this.updateEventsDisplay();

        // Update implementation queue
        this.updateImplementationQueueDisplay();

        // Update emergency powers status
        document.getElementById('emergencyStatus').textContent = 
            this.gameState.emergencyPowers ? 'Active' : 'Inactive';
    }

    updateEventsDisplay() {
        const eventsList = document.getElementById('eventsList');
        eventsList.innerHTML = '';

        this.gameState.events.forEach(event => {
            const eventElement = document.createElement('div');
            eventElement.className = 'event-item';
            eventElement.innerHTML = `
                <div class="event-title">${event.title}</div>
                <div class="event-description">${event.description}</div>
                <div class="event-impact">${event.impact}</div>
            `;
            eventsList.appendChild(eventElement);
        });
    }

    updateImplementationQueueDisplay() {
        const queueList = document.getElementById('implementationQueue');
        queueList.innerHTML = '';

        this.gameState.implementationQueue.forEach(item => {
            const queueElement = document.createElement('div');
            queueElement.className = 'queue-item';
            queueElement.innerHTML = `
                <div class="queue-policy">${item.policy}</div>
                <div class="queue-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${item.progress}%"></div>
                    </div>
                    <span class="progress-text">${item.monthsRemaining} months remaining</span>
                </div>
            `;
            queueList.appendChild(queueElement);
        });

        if (this.gameState.implementationQueue.length === 0) {
            queueList.innerHTML = '<div class="queue-item">No policies currently being implemented</div>';
        }
    }

    calculateMonthsToElection() {
        const now = this.gameState.currentDate;
        const election = this.gameState.electionDate;
        const monthsDiff = (election.getFullYear() - now.getFullYear()) * 12 + 
                          (election.getMonth() - now.getMonth());
        return Math.max(0, monthsDiff);
    }

    showRegionDetails(region) {
        const support = Math.round(this.gameState.regionalSupport[region]);
        this.showMessage(`${region}: ${support}% government support`, 'info');
    }

    showMessage(message, type) {
        // Create a simple toast notification
        const toast = document.createElement('div');
        toast.className = `status status--${type}`;
        toast.style.position = 'fixed';
        toast.style.top = '20px';
        toast.style.right = '20px';
        toast.style.zIndex = '1000';
        toast.style.padding = '12px 16px';
        toast.style.borderRadius = '8px';
        toast.style.maxWidth = '300px';
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize the simulation when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new UKDemocracySimulator();
});