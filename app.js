class UKDemocracySimulator {
    constructor() {
        this.storageKey = 'uk-democracy-simulator-state-v4';
        this.legacyStorageKeys = ['uk-democracy-simulator-state-v3', 'uk-democracy-simulator-state-v2', 'uk-democracy-simulator-state'];
        this.helpSeenKey = 'mandate-2029-help-seen';
        this.voterGroups = {
            'Labour Supporters': 34,
            'Conservative Supporters': 24,
            'LibDem Supporters': 12,
            'Reform Supporters': 14,
            'Green Supporters': 7,
            'Floating Voters': 9
        };
        this.policyNames = {
            nhsFunding: 'NHS Funding',
            socialCare: 'Social Care',
            schoolFunding: 'School Funding',
            higherEd: 'Higher Education',
            incomeTax: 'Income Tax',
            corporationTax: 'Corporation Tax',
            policeFunding: 'Police Funding',
            immigration: 'Immigration Policy'
        };
        this.policyFormatters = {
            nhsFunding: (value) => `£${(215.6 + (value - 50) * 2).toFixed(1)}bn`,
            socialCare: (value) => value < 33 ? 'Low' : value < 66 ? 'Medium' : 'High',
            schoolFunding: (value) => `£${(59.6 + (value - 55) * 1.5).toFixed(1)}bn`,
            higherEd: (value) => value < 33 ? 'Low' : value < 66 ? 'Medium' : 'High',
            incomeTax: (value) => `${value}%`,
            corporationTax: (value) => `${value}%`,
            policeFunding: (value) => value < 33 ? 'Low' : value < 66 ? 'Medium' : 'High',
            immigration: (value) => value < 33 ? 'Liberal' : value < 66 ? 'Moderate' : 'Strict'
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
                },
                stability: 1
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
                metrics: { educationStandards: 0.8 }
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
                    'Conservative Supporters': (value) => value < 25 ? 0.8 : -0.8,
                    'Labour Supporters': (value) => value > 30 ? 0.6 : -0.4,
                    'LibDem Supporters': (value) => value > 25 && value < 35 ? 0.4 : -0.2,
                    'Reform Supporters': (value) => value < 20 ? 0.6 : -0.6,
                    'Floating Voters': (value) => value > 20 && value < 30 ? 0.3 : -0.3
                }
            },
            corporationTax: {
                cost: 10,
                effects: {
                    'Conservative Supporters': (value) => value < 20 ? 0.9 : -0.7,
                    'Labour Supporters': (value) => value > 25 ? 0.5 : -0.3,
                    'LibDem Supporters': (value) => value > 22 && value < 30 ? 0.4 : -0.2,
                    'Green Supporters': (value) => value > 28 ? 0.6 : -0.2
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
                metrics: { crimeRate: -0.4 }
            },
            immigration: {
                cost: 15,
                effects: {
                    'Reform Supporters': (value) => value > 60 ? 1.2 : -0.8,
                    'Conservative Supporters': (value) => value > 50 ? 0.8 : -0.4,
                    'Labour Supporters': (value) => value < 40 ? 0.4 : -0.6,
                    'LibDem Supporters': (value) => value < 30 ? 0.6 : -0.4,
                    'Green Supporters': (value) => value < 25 ? 0.5 : -0.5
                },
                stability: -1
            }
        };
        this.cabinetProfiles = {
            health: { name: 'Wes Streeting', role: 'Health Secretary', competence: 65 },
            treasury: { name: 'Rachel Reeves', role: 'Chancellor', competence: 76 },
            home: { name: 'Yvette Cooper', role: 'Home Secretary', competence: 69 },
            education: { name: 'Bridget Phillipson', role: 'Education Secretary', competence: 67 },
            energy: { name: 'Ed Miliband', role: 'Energy Secretary', competence: 72 },
            whip: { name: 'Alan Campbell', role: 'Chief Whip', competence: 63 }
        };
        this.scenarios = this.createScenarios();
        this.difficulties = this.createDifficulties();
        this.eventTemplates = this.createEventTemplates();
        this.scenarioSelection = { scenarioId: 'labour-2025', difficulty: 'normal' };
        this.gameState = this.createInitialState(this.scenarioSelection);
        this.loadGame();
        this.init();
    }

    createScenarios() {
        return {
            'labour-2025': {
                id: 'labour-2025',
                name: 'Fresh Majority',
                description: 'June 2025. You arrive with a mandate, a giant majority, and no excuse for drift.',
                partyInfo: 'Labour Government',
                pmName: 'Prime Minister: Keir Starmer',
                currentDate: [2025, 5, 1],
                electionDate: [2029, 7, 1],
                politicalCapital: 75,
                approvalRating: 42,
                governmentStability: 64,
                honeymoonMonths: 12,
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
                    educationStandards: 56,
                    crimeRate: 48,
                    gdpGrowth: 2.1,
                    unemployment: 4.2,
                    climateProgress: 39
                },
                cabinetLoyalty: {
                    health: 76,
                    treasury: 83,
                    home: 61,
                    education: 72,
                    energy: 67,
                    whip: 74
                },
                implementationQueue: [
                    {
                        policy: 'NHS Funding Increase',
                        progress: 60,
                        monthsRemaining: 2,
                        effect: {
                            voterApproval: { 'Labour Supporters': 5, 'Floating Voters': 2 },
                            metrics: { nhsWaitingTimes: -1.5 },
                            governmentStability: 2
                        }
                    }
                ],
                events: [
                    {
                        title: 'NHS Winter Pressures',
                        description: 'Hospital chiefs are warning that the waiting list is still politically toxic.',
                        impact: 'The service agenda is already under scrutiny.'
                    },
                    {
                        title: 'Markets Give You Time',
                        description: 'Bond traders are calm for now, but they expect discipline from the Treasury.',
                        impact: 'The economic brief is steady rather than generous.'
                    }
                ],
                electionLedger: [
                    {
                        dateLabel: 'Jun 2025',
                        title: 'Government sworn in',
                        detail: 'A new Labour majority enters office with goodwill, pressure, and almost no room for drift.',
                        tone: 'info'
                    }
                ],
                summary: 'You have just taken office. Choose where to spend your political capital and shape the next election.'
            },
            'winter-crunch': {
                id: 'winter-crunch',
                name: 'Winter Crunch',
                description: 'November 2026. The service state is fraying, growth is weak, and the party is muttering.',
                partyInfo: 'Labour Government',
                pmName: 'Prime Minister: Keir Starmer',
                currentDate: [2026, 10, 1],
                electionDate: [2029, 7, 1],
                politicalCapital: 58,
                approvalRating: 36,
                governmentStability: 48,
                honeymoonMonths: 0,
                policies: {
                    nhsFunding: 54,
                    socialCare: 35,
                    schoolFunding: 52,
                    higherEd: 42,
                    incomeTax: 22,
                    corporationTax: 25,
                    policeFunding: 57,
                    immigration: 44
                },
                voterApproval: {
                    'Labour Supporters': 61,
                    'Conservative Supporters': 24,
                    'LibDem Supporters': 37,
                    'Reform Supporters': 18,
                    'Green Supporters': 46,
                    'Floating Voters': 29
                },
                regionalSupport: {
                    'Scotland': 31,
                    'Northern England': 47,
                    'Midlands': 42,
                    'Wales': 41,
                    'London': 55,
                    'South': 32
                },
                performanceMetrics: {
                    nhsWaitingTimes: 23,
                    educationStandards: 53,
                    crimeRate: 51,
                    gdpGrowth: 0.8,
                    unemployment: 5.4,
                    climateProgress: 34
                },
                cabinetLoyalty: {
                    health: 48,
                    treasury: 59,
                    home: 54,
                    education: 57,
                    energy: 52,
                    whip: 50
                },
                implementationQueue: [
                    {
                        policy: 'Emergency Care Package',
                        progress: 35,
                        monthsRemaining: 3,
                        effect: {
                            voterApproval: { 'Labour Supporters': 4, 'Floating Voters': 2 },
                            metrics: { nhsWaitingTimes: -2.1 },
                            governmentStability: 2
                        }
                    },
                    {
                        policy: 'School Recovery Plan',
                        progress: 50,
                        monthsRemaining: 2,
                        effect: {
                            voterApproval: { 'Labour Supporters': 3, 'LibDem Supporters': 2 },
                            metrics: { educationStandards: 1.2 },
                            governmentStability: 1
                        }
                    }
                ],
                events: [
                    {
                        title: 'Hospitals Running Hot',
                        description: 'The service pressure story has become the frame through which everything else is judged.',
                        impact: 'Your domestic record is in the red.'
                    },
                    {
                        title: 'Treasury Nerves',
                        description: 'Backbenchers fear a tough spring statement and are already distancing themselves.',
                        impact: 'Authority is brittle.'
                    }
                ],
                electionLedger: [
                    {
                        dateLabel: 'Nov 2026',
                        title: 'Crisis inheritance',
                        detail: 'You enter this stretch of the parliament with the NHS overwhelmed and the parliamentary party on edge.',
                        tone: 'warning'
                    }
                ],
                summary: 'The easy months are gone. Every reform now competes with immediate pressure and a restless party.'
            },
            'border-backlash': {
                id: 'border-backlash',
                name: 'Border Backlash',
                description: 'April 2027. The economy is just about intact, but migration and authority dominate the headlines.',
                partyInfo: 'Labour Government',
                pmName: 'Prime Minister: Keir Starmer',
                currentDate: [2027, 3, 1],
                electionDate: [2029, 7, 1],
                politicalCapital: 63,
                approvalRating: 40,
                governmentStability: 52,
                honeymoonMonths: 0,
                policies: {
                    nhsFunding: 48,
                    socialCare: 38,
                    schoolFunding: 54,
                    higherEd: 43,
                    incomeTax: 21,
                    corporationTax: 24,
                    policeFunding: 68,
                    immigration: 61
                },
                voterApproval: {
                    'Labour Supporters': 58,
                    'Conservative Supporters': 23,
                    'LibDem Supporters': 35,
                    'Reform Supporters': 19,
                    'Green Supporters': 41,
                    'Floating Voters': 33
                },
                regionalSupport: {
                    'Scotland': 30,
                    'Northern England': 49,
                    'Midlands': 45,
                    'Wales': 42,
                    'London': 53,
                    'South': 34
                },
                performanceMetrics: {
                    nhsWaitingTimes: 19.5,
                    educationStandards: 55,
                    crimeRate: 50,
                    gdpGrowth: 1.7,
                    unemployment: 4.7,
                    climateProgress: 36
                },
                cabinetLoyalty: {
                    health: 60,
                    treasury: 67,
                    home: 46,
                    education: 63,
                    energy: 51,
                    whip: 58
                },
                implementationQueue: [
                    {
                        policy: 'Border Processing Overhaul',
                        progress: 30,
                        monthsRemaining: 4,
                        effect: {
                            voterApproval: { 'Conservative Supporters': 3, 'Reform Supporters': 2, 'Labour Supporters': -2 },
                            metrics: {},
                            governmentStability: 1
                        }
                    }
                ],
                events: [
                    {
                        title: 'Crossings Dominate Westminster',
                        description: 'Every broadcast round ends with the same question: are you in control?',
                        impact: 'Authority is now the central test of your government.'
                    },
                    {
                        title: 'Growth Still Breathing',
                        description: 'The economy is not booming, but it is not collapsing either.',
                        impact: 'You have just enough room to make hard choices.'
                    }
                ],
                electionLedger: [
                    {
                        dateLabel: 'Apr 2027',
                        title: 'Narrative under siege',
                        detail: 'The public argument has turned into a test of control, discipline, and whether you can hold the centre ground.',
                        tone: 'warning'
                    }
                ],
                summary: 'Your government is not failing on paper, but the narrative is slipping away. Every month is a fight for authority.'
            }
        };
    }

    createDifficulties() {
        return {
            easy: {
                label: 'Easy',
                politicalCapitalMultiplier: 1.18,
                eventImpactMultiplier: 0.82,
                seatBonus: 16,
                confidenceThreshold: 20,
                noConfidenceChance: 0.05,
                stabilityDrift: 2
            },
            normal: {
                label: 'Normal',
                politicalCapitalMultiplier: 1,
                eventImpactMultiplier: 1,
                seatBonus: 0,
                confidenceThreshold: 25,
                noConfidenceChance: 0.1,
                stabilityDrift: 0
            },
            hard: {
                label: 'Hard',
                politicalCapitalMultiplier: 0.93,
                eventImpactMultiplier: 1.14,
                seatBonus: -10,
                confidenceThreshold: 28,
                noConfidenceChance: 0.14,
                stabilityDrift: -2
            },
            nightmare: {
                label: 'Nightmare',
                politicalCapitalMultiplier: 0.82,
                eventImpactMultiplier: 1.3,
                seatBonus: -22,
                confidenceThreshold: 32,
                noConfidenceChance: 0.18,
                stabilityDrift: -5
            }
        };
    }

    createEventTemplates() {
        return [
            {
                id: 'nhs-winter-crisis',
                category: 'Health',
                title: 'NHS Winter Crisis',
                description: 'A brutal flu season has jammed A&E corridors, and every bulletin leads with ambulance delays.',
                impact: 'How you respond will define whether the public sees urgency or drift.',
                probability: 0.18,
                weight: 3,
                trigger: {
                    turnNumber: { min: 2 },
                    currentMonth: { in: [10, 11, 0, 1, 2] },
                    nhsWaitingTimes: { min: 16 }
                },
                choices: [
                    {
                        label: 'Release emergency cash',
                        cost: 14,
                        tone: 'success',
                        summary: 'You flooded the service with short-term money and bought breathing space.',
                        effects: {
                            approvalRating: 2,
                            voterApproval: { 'Labour Supporters': 4, 'Floating Voters': 3, 'Conservative Supporters': 1 },
                            performanceMetrics: { nhsWaitingTimes: -2.6 },
                            governmentStability: 3,
                            cabinetLoyalty: { health: 7 }
                        }
                    },
                    {
                        label: 'Deploy military logistics',
                        cost: 8,
                        tone: 'info',
                        summary: 'It looked decisive, though the service still feels overloaded.',
                        effects: {
                            voterApproval: { 'Floating Voters': 2, 'Conservative Supporters': 2, 'Labour Supporters': 1 },
                            performanceMetrics: { nhsWaitingTimes: -1.3 },
                            governmentStability: 1,
                            cabinetLoyalty: { health: 3, whip: 2 }
                        }
                    },
                    {
                        label: 'Stay disciplined and wait',
                        cost: 0,
                        tone: 'error',
                        summary: 'The Treasury stayed calm, but the public concluded that you were absent.',
                        effects: {
                            approvalRating: -3,
                            voterApproval: { 'Labour Supporters': -6, 'Floating Voters': -4, 'LibDem Supporters': -3 },
                            performanceMetrics: { nhsWaitingTimes: 2.1 },
                            governmentStability: -4,
                            cabinetLoyalty: { health: -10 }
                        }
                    }
                ]
            },
            {
                id: 'budget-black-hole',
                category: 'Treasury',
                title: 'Budget Black Hole',
                description: 'Officials warn that departmental promises no longer add up and the spring statement is approaching fast.',
                impact: 'You need to decide whether to tax, cut, or gamble on growth.',
                probability: 0.16,
                weight: 2,
                trigger: {
                    turnNumber: { min: 3 },
                    governmentStability: { max: 62 },
                    gdpGrowth: { max: 2.3 }
                },
                choices: [
                    {
                        label: 'Raise income tax by one point',
                        cost: 10,
                        tone: 'warning',
                        summary: 'The books steadied, but voters felt the squeeze immediately.',
                        effects: {
                            voterApproval: { 'Labour Supporters': 2, 'Conservative Supporters': -4, 'Floating Voters': -3, 'Reform Supporters': -2 },
                            performanceMetrics: { gdpGrowth: -0.2, unemployment: 0.1 },
                            governmentStability: 1,
                            cabinetLoyalty: { treasury: 5, whip: -2 }
                        }
                    },
                    {
                        label: 'Cut capital projects',
                        cost: 6,
                        tone: 'error',
                        summary: 'The market liked the discipline, but your own coalition hated the retreat.',
                        effects: {
                            approvalRating: -2,
                            voterApproval: { 'Labour Supporters': -3, 'LibDem Supporters': -3, 'Green Supporters': -4 },
                            performanceMetrics: { climateProgress: -2.2, gdpGrowth: -0.1 },
                            governmentStability: -2,
                            cabinetLoyalty: { energy: -7, treasury: 4 }
                        }
                    },
                    {
                        label: 'Promise growth will close the gap',
                        cost: 4,
                        tone: 'info',
                        summary: 'You bought a month of political space, but the numbers still look thin.',
                        effects: {
                            voterApproval: { 'Floating Voters': 1, 'Conservative Supporters': -1 },
                            governmentStability: -1,
                            cabinetLoyalty: { treasury: -5, whip: -3 }
                        }
                    }
                ]
            },
            {
                id: 'asylum-hotels-row',
                category: 'Home Office',
                title: 'Asylum Hotels Row',
                description: 'The Home Office has been caught flat-footed and the issue is now swallowing every interview.',
                impact: 'The right wants force, the centre wants competence, and the left wants decency.',
                probability: 0.19,
                weight: 3,
                trigger: {
                    turnNumber: { min: 2 },
                    immigration: { min: 28 }
                },
                choices: [
                    {
                        label: 'Expand case processing staff',
                        cost: 12,
                        tone: 'success',
                        summary: 'It is expensive, but at least you look serious about state capacity.',
                        effects: {
                            voterApproval: { 'Floating Voters': 3, 'Labour Supporters': 2, 'LibDem Supporters': 2, 'Reform Supporters': -1 },
                            governmentStability: 2,
                            cabinetLoyalty: { home: 5 }
                        }
                    },
                    {
                        label: 'Talk tougher and crack down',
                        cost: 7,
                        tone: 'warning',
                        summary: 'The optics improved on the right, but progressives accused you of panic politics.',
                        effects: {
                            voterApproval: { 'Conservative Supporters': 3, 'Reform Supporters': 4, 'Labour Supporters': -3, 'Green Supporters': -4, 'LibDem Supporters': -2 },
                            governmentStability: 1,
                            cabinetLoyalty: { home: 2, energy: -2 }
                        }
                    },
                    {
                        label: 'Refuse to chase the story',
                        cost: 0,
                        tone: 'error',
                        summary: 'You tried not to feed the cycle, but it read as weakness.',
                        effects: {
                            approvalRating: -3,
                            voterApproval: { 'Floating Voters': -4, 'Conservative Supporters': -2, 'Reform Supporters': -5 },
                            governmentStability: -3,
                            cabinetLoyalty: { home: -8, whip: -4 }
                        }
                    }
                ]
            },
            {
                id: 'local-elections',
                category: 'Politics',
                title: 'Local Elections Bloodbath',
                description: 'A miserable council result has triggered a weekend of panic calls from MPs in marginal seats.',
                impact: 'The party is no longer willing to assume the national picture will turn by itself.',
                probability: 0.15,
                weight: 2,
                trigger: {
                    turnNumber: { min: 4 },
                    currentMonth: { in: [3, 4] },
                    approvalRating: { max: 48 }
                },
                choices: [
                    {
                        label: 'Reshuffle and reset',
                        cost: 11,
                        tone: 'info',
                        summary: 'The headlines shifted, though everyone can smell the desperation.',
                        effects: {
                            voterApproval: { 'Floating Voters': 2, 'Labour Supporters': 1 },
                            governmentStability: 2,
                            cabinetLoyalty: { whip: 6, home: -2, health: -2 }
                        }
                    },
                    {
                        label: 'Double down on the plan',
                        cost: 5,
                        tone: 'warning',
                        summary: 'The core respected the resolve, but waverers heard stubbornness.',
                        effects: {
                            voterApproval: { 'Labour Supporters': 2, 'Floating Voters': -3, 'LibDem Supporters': -2 },
                            governmentStability: -1,
                            cabinetLoyalty: { whip: 3, treasury: 2 }
                        }
                    },
                    {
                        label: 'Blame local factors',
                        cost: 0,
                        tone: 'error',
                        summary: 'No one bought it. Westminster now smells fear.',
                        effects: {
                            approvalRating: -2,
                            voterApproval: { 'Labour Supporters': -2, 'Floating Voters': -3 },
                            governmentStability: -4,
                            cabinetLoyalty: { whip: -6 }
                        }
                    }
                ]
            },
            {
                id: 'flooding-emergency',
                category: 'Environment',
                title: 'Flooding Emergency',
                description: 'Storm damage has washed through several towns and ministers are being asked where the state was.',
                impact: 'Competence matters more than ideology when homes are underwater.',
                probability: 0.12,
                weight: 2,
                trigger: {
                    turnNumber: { min: 2 },
                    currentMonth: { in: [8, 9, 10, 11, 0, 1] }
                },
                choices: [
                    {
                        label: 'Deploy recovery package',
                        cost: 13,
                        tone: 'success',
                        summary: 'A visible intervention steadied the story and reassured nervous regions.',
                        effects: {
                            voterApproval: { 'Floating Voters': 4, 'Green Supporters': 3, 'Conservative Supporters': 1 },
                            performanceMetrics: { climateProgress: 1.6 },
                            governmentStability: 3,
                            cabinetLoyalty: { energy: 4, whip: 2 }
                        }
                    },
                    {
                        label: 'Use local resilience funds',
                        cost: 7,
                        tone: 'info',
                        summary: 'It looked tidy on paper, but communities still felt under-served.',
                        effects: {
                            voterApproval: { 'Floating Voters': 1, 'Green Supporters': 1 },
                            governmentStability: 0,
                            cabinetLoyalty: { energy: 2 }
                        }
                    },
                    {
                        label: 'Offer sympathy, not spending',
                        cost: 0,
                        tone: 'error',
                        summary: 'The lack of action made you look detached and cheap.',
                        effects: {
                            approvalRating: -3,
                            voterApproval: { 'Floating Voters': -5, 'Green Supporters': -4, 'Labour Supporters': -2 },
                            governmentStability: -4,
                            cabinetLoyalty: { energy: -6, whip: -2 }
                        }
                    }
                ]
            },
            {
                id: 'energy-bill-spike',
                category: 'Cost of Living',
                title: 'Energy Bill Spike',
                description: 'Wholesale prices have jumped and household bills are about to become the only thing voters talk about.',
                impact: 'This is a pure cost-of-living test with no painless answer.',
                probability: 0.17,
                weight: 3,
                trigger: {
                    turnNumber: { min: 3 },
                    floatingVoters: { max: 42 },
                    unemployment: { min: 4.5 }
                },
                choices: [
                    {
                        label: 'Cap bills with Treasury support',
                        cost: 15,
                        tone: 'success',
                        summary: 'The intervention was pricey but the public instantly understood it.',
                        effects: {
                            approvalRating: 2,
                            voterApproval: { 'Labour Supporters': 3, 'Floating Voters': 4, 'LibDem Supporters': 2 },
                            performanceMetrics: { gdpGrowth: 0.1, unemployment: -0.1 },
                            governmentStability: 2,
                            cabinetLoyalty: { treasury: -2, energy: 5 }
                        }
                    },
                    {
                        label: 'Target help at the poorest',
                        cost: 9,
                        tone: 'info',
                        summary: 'It was defensible and fiscally neater, though many households still felt abandoned.',
                        effects: {
                            voterApproval: { 'Labour Supporters': 2, 'Green Supporters': 1, 'Floating Voters': 1, 'Conservative Supporters': -1 },
                            governmentStability: 1,
                            cabinetLoyalty: { treasury: 2, energy: 2 }
                        }
                    },
                    {
                        label: 'Tell the public to ride it out',
                        cost: 0,
                        tone: 'error',
                        summary: 'The Treasury saved money, but the politics was vicious.',
                        effects: {
                            approvalRating: -4,
                            voterApproval: { 'Floating Voters': -5, 'Labour Supporters': -3, 'LibDem Supporters': -3 },
                            performanceMetrics: { unemployment: 0.2 },
                            governmentStability: -4,
                            cabinetLoyalty: { treasury: -5, whip: -4 }
                        }
                    }
                ]
            },
            {
                id: 'teacher-strike-wave',
                category: 'Education',
                title: 'Teacher Strike Wave',
                description: 'School leaders warn that coordinated strike action is close after another bruising pay round.',
                impact: 'Parents want the dispute over quickly, but every settlement now comes with a visible political price tag.',
                probability: 0.16,
                weight: 3,
                trigger: {
                    turnNumber: { min: 3 },
                    educationStandards: { max: 58 },
                    schoolFunding: { max: 55 }
                },
                choices: [
                    {
                        label: 'Settle with a pay package',
                        cost: 12,
                        tone: 'success',
                        summary: 'You ended the row fast and looked like a government that still knows how to govern.',
                        effects: {
                            approvalRating: 1,
                            voterApproval: { 'Labour Supporters': 2, 'LibDem Supporters': 3, 'Floating Voters': 2 },
                            performanceMetrics: { educationStandards: 2.2 },
                            governmentStability: 2,
                            cabinetLoyalty: { education: 6 }
                        }
                    },
                    {
                        label: 'Launch a review and buy time',
                        cost: 5,
                        tone: 'info',
                        summary: 'The immediate anger cooled, though nobody thinks the argument is really over.',
                        effects: {
                            voterApproval: { 'Labour Supporters': 1, 'Floating Voters': 1, 'LibDem Supporters': 1 },
                            performanceMetrics: { educationStandards: 0.6 },
                            cabinetLoyalty: { education: 2 },
                            governmentStability: 0
                        }
                    },
                    {
                        label: 'Hold the line on pay',
                        cost: 0,
                        tone: 'error',
                        summary: 'The dispute hardened, parents turned on you, and the schools brief became another open wound.',
                        effects: {
                            approvalRating: -3,
                            voterApproval: { 'Labour Supporters': -3, 'LibDem Supporters': -4, 'Floating Voters': -3 },
                            performanceMetrics: { educationStandards: -1.8 },
                            governmentStability: -3,
                            cabinetLoyalty: { education: -8, whip: -2 }
                        }
                    }
                ]
            },
            {
                id: 'backbench-rebellion',
                category: 'Party Management',
                title: 'Backbench Rebellion',
                description: 'A bloc of your own MPs is threatening to break cover unless the government changes course.',
                impact: 'This is less about ideology than authority. If you mishandle it, the scent of weakness will linger.',
                probability: 0.15,
                weight: 4,
                trigger: {
                    turnNumber: { min: 5 },
                    governmentStability: { max: 56 },
                    cabinetAverage: { max: 64 }
                },
                choices: [
                    {
                        label: 'Offer concessions and calm them down',
                        cost: 9,
                        tone: 'warning',
                        summary: 'You bought peace for now, though Westminster immediately clocked the retreat.',
                        effects: {
                            voterApproval: { 'Labour Supporters': 2, 'Floating Voters': -1 },
                            governmentStability: 3,
                            cabinetLoyalty: { whip: 8, treasury: -3 }
                        }
                    },
                    {
                        label: 'Whip hard and threaten consequences',
                        cost: 6,
                        tone: 'info',
                        summary: 'The machine reasserted itself, but a few bruised egos will stay bruised.',
                        effects: {
                            approvalRating: -1,
                            voterApproval: { 'Labour Supporters': -1, 'Conservative Supporters': 1 },
                            governmentStability: 1,
                            cabinetLoyalty: { whip: 5, home: 2, health: -2 }
                        }
                    },
                    {
                        label: 'Dare them to make their move',
                        cost: 0,
                        tone: 'error',
                        summary: 'The bluff did not project strength. It made the government look close to losing control.',
                        effects: {
                            approvalRating: -2,
                            voterApproval: { 'Labour Supporters': -3, 'Floating Voters': -2 },
                            governmentStability: -5,
                            cabinetLoyalty: { whip: -9, treasury: -3, home: -2 }
                        }
                    }
                ]
            },
            {
                id: 'steelworks-cliff-edge',
                category: 'Industry',
                title: 'Steelworks on the Brink',
                description: 'A major plant is warning of closure, with jobs and local pride hanging on what you do next.',
                impact: 'This is an economics story in Westminster and a betrayal story everywhere else.',
                probability: 0.14,
                weight: 3,
                trigger: {
                    turnNumber: { min: 4 },
                    gdpGrowth: { max: 2.1 },
                    midlandsSupport: { max: 49 }
                },
                choices: [
                    {
                        label: 'Step in with a bridge package',
                        cost: 13,
                        tone: 'success',
                        summary: 'You looked active and patriotic, even if the Treasury is muttering about the bill already.',
                        effects: {
                            voterApproval: { 'Labour Supporters': 2, 'Floating Voters': 2, 'Green Supporters': 1 },
                            regionalSupport: { 'Midlands': 4, 'Northern England': 3, 'Wales': 1 },
                            performanceMetrics: { gdpGrowth: 0.2, unemployment: -0.1 },
                            governmentStability: 2,
                            cabinetLoyalty: { treasury: -3, whip: 2 }
                        }
                    },
                    {
                        label: 'Back a transition and retraining deal',
                        cost: 8,
                        tone: 'info',
                        summary: 'The policy class nodded approvingly, but the communities at risk still felt anxious.',
                        effects: {
                            voterApproval: { 'Floating Voters': 1, 'Green Supporters': 2, 'Labour Supporters': 1 },
                            regionalSupport: { 'Midlands': 2, 'Northern England': 2 },
                            performanceMetrics: { climateProgress: 1.4, gdpGrowth: 0.1 },
                            governmentStability: 1,
                            cabinetLoyalty: { energy: 3, treasury: 1 }
                        }
                    },
                    {
                        label: 'Let the market decide',
                        cost: 0,
                        tone: 'error',
                        summary: 'The economic purists were satisfied, but the affected towns concluded you were happy to sacrifice them.',
                        effects: {
                            approvalRating: -3,
                            voterApproval: { 'Labour Supporters': -2, 'Floating Voters': -4, 'Conservative Supporters': 1 },
                            regionalSupport: { 'Midlands': -5, 'Northern England': -4, 'Wales': -2 },
                            performanceMetrics: { unemployment: 0.3 },
                            governmentStability: -3,
                            cabinetLoyalty: { whip: -5, treasury: 2 }
                        }
                    }
                ]
            },
            {
                id: 'summer-heatwave',
                category: 'Climate',
                title: 'Heatwave Infrastructure Failure',
                description: 'Rail buckling, school closures, and water shortages have turned a hot spell into a competence test.',
                impact: 'The weather itself is not your fault. The public verdict on preparedness absolutely is.',
                probability: 0.15,
                weight: 2,
                trigger: {
                    turnNumber: { min: 2 },
                    currentMonth: { in: [5, 6, 7] },
                    climateProgress: { max: 44 }
                },
                choices: [
                    {
                        label: 'Fund emergency resilience works',
                        cost: 11,
                        tone: 'success',
                        summary: 'The intervention was expensive, but voters saw visible seriousness and local authorities finally got cover.',
                        effects: {
                            voterApproval: { 'Floating Voters': 2, 'Green Supporters': 4, 'Labour Supporters': 1 },
                            regionalSupport: { 'South': 2, 'London': 1 },
                            performanceMetrics: { climateProgress: 2.4 },
                            governmentStability: 2,
                            cabinetLoyalty: { energy: 5 }
                        }
                    },
                    {
                        label: 'Order restrictions and blame ageing infrastructure',
                        cost: 5,
                        tone: 'warning',
                        summary: 'It sounded practical, though many households still felt like they were being told to cope alone.',
                        effects: {
                            voterApproval: { 'Green Supporters': 2, 'Floating Voters': -1, 'Reform Supporters': -2 },
                            performanceMetrics: { climateProgress: 1.2 },
                            governmentStability: 0,
                            cabinetLoyalty: { energy: 2 }
                        }
                    },
                    {
                        label: 'Offer sympathy and move on',
                        cost: 0,
                        tone: 'error',
                        summary: 'The lack of visible intervention made the government look caught out by the obvious.',
                        effects: {
                            approvalRating: -3,
                            voterApproval: { 'Floating Voters': -4, 'Green Supporters': -5, 'Labour Supporters': -2 },
                            performanceMetrics: { climateProgress: -1 },
                            governmentStability: -3,
                            cabinetLoyalty: { energy: -6, whip: -2 }
                        }
                    }
                ]
            },
            {
                id: 'channel-crossings-surge',
                category: 'Migration',
                title: 'Channel Crossings Surge',
                description: 'A sudden spike in arrivals has reset the politics of the border overnight and every faction wants a different answer.',
                impact: 'Authority, legality, and administrative competence are now colliding in full public view.',
                probability: 0.22,
                weight: 4,
                trigger: {
                    turnNumber: { min: 2 },
                    scenarioId: { in: ['border-backlash'] },
                    immigration: { min: 55 }
                },
                choices: [
                    {
                        label: 'Push a removals pact and tougher rhetoric',
                        cost: 10,
                        tone: 'warning',
                        summary: 'The right noticed the edge, but progressives heard you borrowing your opponents language.',
                        effects: {
                            voterApproval: { 'Conservative Supporters': 3, 'Reform Supporters': 4, 'Labour Supporters': -2, 'LibDem Supporters': -3, 'Green Supporters': -4 },
                            governmentStability: 2,
                            cabinetLoyalty: { home: 5, whip: 2 }
                        }
                    },
                    {
                        label: 'Expand courts and casework capacity',
                        cost: 12,
                        tone: 'success',
                        summary: 'It looked expensive, but at least it looked like the state was trying to function again.',
                        effects: {
                            approvalRating: 1,
                            voterApproval: { 'Floating Voters': 3, 'Labour Supporters': 1, 'LibDem Supporters': 2, 'Reform Supporters': -1 },
                            governmentStability: 2,
                            cabinetLoyalty: { home: 4 }
                        }
                    },
                    {
                        label: 'Wait for the story to cool',
                        cost: 0,
                        tone: 'error',
                        summary: 'The issue did not cool. It became the only thing anyone wanted to talk about.',
                        effects: {
                            approvalRating: -4,
                            voterApproval: { 'Floating Voters': -4, 'Reform Supporters': -6, 'Conservative Supporters': -2 },
                            governmentStability: -4,
                            cabinetLoyalty: { home: -8, whip: -4 }
                        }
                    }
                ]
            },
            {
                id: 'interest-rate-shock',
                category: 'Economy',
                title: 'Interest Rate Shock',
                description: 'Higher borrowing costs are biting hard and mortgage headlines have suddenly become politically lethal.',
                impact: 'The public wants protection, the Treasury wants caution, and you do not have enough room for both.',
                probability: 0.2,
                weight: 4,
                trigger: {
                    turnNumber: { min: 2 },
                    scenarioId: { in: ['winter-crunch'] },
                    gdpGrowth: { max: 1.2 },
                    unemployment: { min: 5 }
                },
                choices: [
                    {
                        label: 'Announce mortgage relief',
                        cost: 14,
                        tone: 'success',
                        summary: 'It was expensive, but homeowners heard the government moving before panic fully set in.',
                        effects: {
                            approvalRating: 2,
                            voterApproval: { 'Floating Voters': 4, 'Labour Supporters': 2, 'LibDem Supporters': 1 },
                            performanceMetrics: { gdpGrowth: 0.2, unemployment: -0.1 },
                            governmentStability: 2,
                            cabinetLoyalty: { treasury: -4, whip: 2 }
                        }
                    },
                    {
                        label: 'Fund help with cuts elsewhere',
                        cost: 8,
                        tone: 'warning',
                        summary: 'The arithmetic held together, but parts of the coalition immediately felt sacrificed.',
                        effects: {
                            voterApproval: { 'Floating Voters': 1, 'Green Supporters': -2, 'Labour Supporters': -1 },
                            performanceMetrics: { climateProgress: -1.4 },
                            governmentStability: 0,
                            cabinetLoyalty: { treasury: 3, energy: -4 }
                        }
                    },
                    {
                        label: 'Blame the global cycle and hold firm',
                        cost: 0,
                        tone: 'error',
                        summary: 'The explanation may have been true, but it still sounded like helplessness.',
                        effects: {
                            approvalRating: -3,
                            voterApproval: { 'Floating Voters': -4, 'Labour Supporters': -2, 'Conservative Supporters': 1 },
                            performanceMetrics: { unemployment: 0.2 },
                            governmentStability: -3,
                            cabinetLoyalty: { treasury: -4, whip: -3 }
                        }
                    }
                ]
            }
        ];
    }

    createInitialState(selection = {}) {
        const scenarioId = selection.scenarioId || 'labour-2025';
        const difficulty = selection.difficulty || 'normal';
        const scenario = this.scenarios[scenarioId] || this.scenarios['labour-2025'];
        const currentDate = new Date(...scenario.currentDate);
        const electionDate = new Date(...scenario.electionDate);
        const cabinet = {};
        Object.entries(this.cabinetProfiles).forEach(([portfolio, profile]) => {
            cabinet[portfolio] = {
                ...profile,
                loyalty: scenario.cabinetLoyalty[portfolio]
            };
        });
        const pollEntry = {
            label: this.formatDateLabelFor(currentDate),
            approval: scenario.approvalRating,
            stability: scenario.governmentStability,
            projectedSeats: 228,
            outlook: 'Narrow lead'
        };

        return {
            version: 4,
            scenarioId,
            difficulty,
            scenarioName: scenario.name,
            partyInfo: scenario.partyInfo,
            pmName: scenario.pmName,
            currentDate,
            electionDate,
            politicalCapital: scenario.politicalCapital,
            approvalRating: scenario.approvalRating,
            governmentStability: scenario.governmentStability,
            turnNumber: 1,
            emergencyPowers: false,
            confidenceWarnings: 0,
            electionResolved: false,
            electionResult: null,
            pendingEvent: null,
            recentEventIds: [],
            deliveredPolicies: 0,
            legacyScore: 54,
            lastTurnSummary: scenario.summary,
            honeymoonMonths: scenario.honeymoonMonths,
            policies: { ...scenario.policies },
            voterApproval: { ...scenario.voterApproval },
            regionalSupport: { ...scenario.regionalSupport },
            performanceMetrics: { ...scenario.performanceMetrics },
            cabinet,
            agendaItems: [],
            issuePressures: {
                publicServices: 52,
                economy: 48,
                livingStandards: 50,
                immigration: 44,
                climate: 49,
                security: 46
            },
            mediaNarrative: {
                headline: 'A new government is still defining what competence looks like.',
                summary: 'The country is watching delivery, not just rhetoric.',
                tone: 'info',
                talkingPoints: [
                    'Visible delivery will matter more than clean speeches.',
                    'Front-line services remain the first test of competence.',
                    'The next few months will define the political weather.'
                ]
            },
            pollHistory: [pollEntry],
            electionLedger: scenario.electionLedger.map((entry) => ({ ...entry })),
            implementationQueue: scenario.implementationQueue.map((item) => ({
                ...item,
                effect: {
                    voterApproval: { ...(item.effect.voterApproval || {}) },
                    metrics: { ...(item.effect.metrics || {}) },
                    governmentStability: item.effect.governmentStability || 0
                }
            })),
            events: scenario.events.map((event) => ({ ...event }))
        };
    }

    init() {
        this.bindEvents();
        this.syncSliders();
        this.refreshCampaignState();
        this.recordPollSnapshot();
        this.updatePolicyCosts();
        this.updateDisplay();
        if (!localStorage.getItem(this.helpSeenKey)) {
            this.showHelpModal();
        }
    }

    bindEvents() {
        document.getElementById('nextTurnBtn').addEventListener('click', () => this.nextTurn());
        document.getElementById('helpBtn').addEventListener('click', () => this.showHelpModal());
        document.getElementById('closeHelpBtn').addEventListener('click', () => this.hideHelpModal(true));
        document.getElementById('saveGameBtn').addEventListener('click', () => this.saveGame(true));
        document.getElementById('resetGameBtn').addEventListener('click', () => this.openScenarioModal());
        document.getElementById('restartGameBtn').addEventListener('click', () => this.openScenarioModal(true));
        document.getElementById('scenarioConfirmBtn').addEventListener('click', () => this.confirmScenarioSelection());
        document.getElementById('scenarioCancelBtn').addEventListener('click', () => this.closeScenarioModal());

        window.addEventListener('keydown', (event) => {
            if (event.key === '?') {
                event.preventDefault();
                this.showHelpModal();
            }
            if (event.key === 'Escape') {
                this.hideHelpModal();
                this.closeScenarioModal();
            }
        });

        document.querySelectorAll('.policy-slider').forEach((slider) => {
            slider.addEventListener('input', (event) => {
                this.updatePolicyValue(event.target.id, event.target.value);
                this.updatePolicyCosts();
            });
        });

        document.getElementById('regionalMap').addEventListener('click', (event) => {
            const trigger = event.target.closest('[data-region]');
            if (trigger) this.showRegionDetails(trigger.dataset.region);
        });
        document.getElementById('regionalSupportList').addEventListener('click', (event) => {
            const trigger = event.target.closest('[data-region]');
            if (trigger) this.showRegionDetails(trigger.dataset.region);
        });

        document.querySelectorAll('.scenario-option').forEach((button) => {
            button.addEventListener('click', () => {
                this.scenarioSelection.scenarioId = button.dataset.scenario;
                this.renderScenarioSelection();
            });
        });

        document.querySelectorAll('.difficulty-option').forEach((button) => {
            button.addEventListener('click', () => {
                this.scenarioSelection.difficulty = button.dataset.difficulty;
                this.renderScenarioSelection();
            });
        });
    }

    syncSliders() {
        document.querySelectorAll('.policy-slider').forEach((slider) => {
            slider.value = this.gameState.policies[slider.id];
            this.updatePolicyValue(slider.id, slider.value);
        });
    }

    updatePolicyValue(policyId, value) {
        const container = document.getElementById(policyId)?.parentNode;
        const formatter = this.policyFormatters[policyId];
        if (!container || !formatter) return;
        container.querySelector('.policy-value').textContent = formatter(parseInt(value, 10));
    }

    getPolicyCost(policyId, currentValue, newValue) {
        const baseCost = this.policyEffects[policyId]?.cost || 5;
        const change = Math.abs(newValue - currentValue);
        return change === 0 ? 0 : Math.max(1, Math.ceil(baseCost * (change / 25)));
    }

    updatePolicyCosts() {
        document.querySelectorAll('.policy-slider').forEach((slider) => {
            const currentValue = this.gameState.policies[slider.id];
            const nextValue = parseInt(slider.value, 10);
            slider.parentNode.querySelector('.policy-cost').textContent = `Cost: ${this.getPolicyCost(slider.id, currentValue, nextValue)} PC`;
        });
    }

    nextTurn() {
        if (this.gameState.electionResolved) {
            this.showMessage('The election has already been held. Choose a new government to keep playing.', 'info');
            return;
        }
        if (this.gameState.pendingEvent) {
            this.showMessage('A live crisis needs a decision before you can advance again.', 'warning');
            this.openEventModal();
            return;
        }

        const previousApproval = this.gameState.approvalRating;
        this.gameState.currentDate.setMonth(this.gameState.currentDate.getMonth() + 1);
        this.gameState.turnNumber += 1;
        const changes = this.processPolicyChanges();
        const completed = this.updateImplementationQueue();
        this.updatePerformanceMetrics();
        const issuePressures = this.buildIssuePressures();
        this.applyNationalMoodDrift(issuePressures);
        this.recalculateApproval();
        this.generatePoliticalCapital();
        this.updateGovernmentStability();

        const specialOutcome = this.checkSpecialConditions();
        if (!specialOutcome && this.calculateMonthsToElection() === 0) {
            this.resolveElection();
        }

        const event = !this.gameState.electionResolved ? this.generateRandomEvent() : null;
        this.refreshCampaignState(issuePressures);
        if (!event) {
            this.recordPollSnapshot();
        }

        this.gameState.lastTurnSummary = this.buildTurnSummary(
            this.gameState.approvalRating - previousApproval,
            changes,
            completed,
            event
        );
        this.updateDisplay();
        this.updatePolicyCosts();
        this.saveGame(false);
    }

    processPolicyChanges() {
        const report = { spent: 0, changes: [] };
        document.querySelectorAll('.policy-slider').forEach((slider) => {
            const policyId = slider.id;
            const currentValue = this.gameState.policies[policyId];
            const newValue = parseInt(slider.value, 10);
            if (currentValue === newValue) return;

            const cost = this.getPolicyCost(policyId, currentValue, newValue);
            if (this.gameState.politicalCapital < cost) {
                slider.value = currentValue;
                this.updatePolicyValue(policyId, currentValue);
                this.showMessage('Not enough Political Capital for this change.', 'error');
                return;
            }

            this.gameState.politicalCapital -= cost;
            this.gameState.policies[policyId] = newValue;
            this.gameState.implementationQueue.push({
                policy: this.policyNames[policyId],
                progress: 0,
                monthsRemaining: Math.ceil(Math.abs(newValue - currentValue) / 10) + 1,
                effect: this.calculatePolicyEffect(policyId, newValue)
            });
            report.spent += cost;
            report.changes.push(`${this.policyNames[policyId]} to ${this.policyFormatters[policyId](newValue)}`);
        });

        if (report.changes.length) {
            this.logLedgerEntry(
                'Cabinet reset agreed',
                `You committed ${report.spent} political capital to ${report.changes.join(', ')}.`,
                'info'
            );
        }

        return report;
    }

    calculatePolicyEffect(policyId, value) {
        const config = this.policyEffects[policyId];
        const result = { voterApproval: {}, metrics: {}, governmentStability: config?.stability || 0 };
        if (!config) return result;
        Object.entries(config.effects || {}).forEach(([group, effect]) => {
            result.voterApproval[group] = typeof effect === 'function' ? effect(value) : effect * (value / 50);
        });
        result.metrics = { ...(config.metrics || {}) };
        return result;
    }

    updateImplementationQueue() {
        const completed = [];
        const nextQueue = [];
        this.gameState.implementationQueue.forEach((item) => {
            const updated = { ...item, monthsRemaining: item.monthsRemaining - 1 };
            updated.progress = updated.monthsRemaining <= 0
                ? 100
                : Math.round((1 - updated.monthsRemaining / (updated.monthsRemaining + 1)) * 100);
            if (updated.monthsRemaining <= 0) {
                this.applyPolicyEffect(updated.effect);
                completed.push(updated.policy);
                this.gameState.deliveredPolicies += 1;
                this.logLedgerEntry(
                    'Policy delivered',
                    `${updated.policy} has now landed with departments and voters alike.`,
                    'success'
                );
            } else {
                nextQueue.push(updated);
            }
        });
        this.gameState.implementationQueue = nextQueue;
        return completed;
    }

    applyPolicyEffect(effect) {
        Object.entries(effect.voterApproval || {}).forEach(([group, delta]) => {
            this.gameState.voterApproval[group] = this.clamp(this.gameState.voterApproval[group] + delta, 0, 100);
        });
        Object.entries(effect.metrics || {}).forEach(([metric, delta]) => {
            if (typeof this.gameState.performanceMetrics[metric] === 'number') {
                this.gameState.performanceMetrics[metric] = this.clampMetric(metric, this.gameState.performanceMetrics[metric] + delta);
            }
        });
        this.gameState.governmentStability = this.clamp(
            this.gameState.governmentStability + (effect.governmentStability || 0),
            0,
            100
        );
    }

    getEventSignals() {
        return {
            scenarioId: this.gameState.scenarioId,
            turnNumber: this.gameState.turnNumber,
            currentMonth: this.gameState.currentDate.getMonth(),
            approvalRating: this.gameState.approvalRating,
            governmentStability: this.gameState.governmentStability,
            cabinetAverage: this.getAverageCabinetLoyalty(),
            monthsToElection: this.calculateMonthsToElection(),
            floatingVoters: this.gameState.voterApproval['Floating Voters'],
            labourSupporters: this.gameState.voterApproval['Labour Supporters'],
            greenSupporters: this.gameState.voterApproval['Green Supporters'],
            reformSupporters: this.gameState.voterApproval['Reform Supporters'],
            midlandsSupport: this.gameState.regionalSupport['Midlands'],
            northernSupport: this.gameState.regionalSupport['Northern England'],
            londonSupport: this.gameState.regionalSupport['London'],
            nhsWaitingTimes: this.gameState.performanceMetrics.nhsWaitingTimes,
            educationStandards: this.gameState.performanceMetrics.educationStandards,
            crimeRate: this.gameState.performanceMetrics.crimeRate,
            gdpGrowth: this.gameState.performanceMetrics.gdpGrowth,
            unemployment: this.gameState.performanceMetrics.unemployment,
            climateProgress: this.gameState.performanceMetrics.climateProgress,
            schoolFunding: this.gameState.policies.schoolFunding,
            higherEd: this.gameState.policies.higherEd,
            policeFunding: this.gameState.policies.policeFunding,
            immigration: this.gameState.policies.immigration
        };
    }

    matchesEventRule(value, rule) {
        if (rule == null) return true;
        if (Array.isArray(rule)) return rule.includes(value);
        if (typeof rule !== 'object') return value === rule;
        if (Array.isArray(rule.in) && !rule.in.includes(value)) return false;
        if (Array.isArray(rule.notIn) && rule.notIn.includes(value)) return false;
        if (typeof value === 'number') {
            if (typeof rule.min === 'number' && value < rule.min) return false;
            if (typeof rule.max === 'number' && value > rule.max) return false;
        }
        return true;
    }

    isEventEligible(event) {
        if (this.gameState.recentEventIds.includes(event.id)) return false;
        const signals = this.getEventSignals();
        return Object.entries(event.trigger || {}).every(([key, rule]) => this.matchesEventRule(signals[key], rule));
    }

    getEventWeight(event) {
        const signals = this.getEventSignals();
        let weight = event.weight || 1;
        Object.entries(event.trigger || {}).forEach(([key, rule]) => {
            const value = signals[key];
            if (typeof value !== 'number' || !rule || typeof rule !== 'object') return;
            if (typeof rule.min === 'number' && value > rule.min) {
                weight += (value - rule.min) * 0.22;
            }
            if (typeof rule.max === 'number' && value < rule.max) {
                weight += (rule.max - value) * 0.22;
            }
        });
        return Math.max(1, weight);
    }

    getEventPressure() {
        const metrics = this.gameState.performanceMetrics;
        let pressure = 0.24;
        pressure += Math.max(0, 44 - this.gameState.approvalRating) * 0.012;
        pressure += Math.max(0, 58 - this.gameState.governmentStability) * 0.008;
        pressure += Math.max(0, 65 - this.getAverageCabinetLoyalty()) * 0.006;
        pressure += Math.max(0, metrics.nhsWaitingTimes - 18) * 0.014;
        pressure += Math.max(0, 1.8 - metrics.gdpGrowth) * 0.04;
        pressure += Math.max(0, metrics.unemployment - 4.8) * 0.05;
        pressure += Math.max(0, 38 - metrics.climateProgress) * 0.008;
        pressure += this.gameState.confidenceWarnings * 0.05;
        return this.clamp(pressure, 0.2, 0.72);
    }

    generateRandomEvent() {
        if (Math.random() >= this.getEventPressure()) return null;
        const eligible = this.eventTemplates.filter((event) => this.isEventEligible(event) && Math.random() < event.probability);
        if (!eligible.length) return null;
        const weighted = eligible.map((event) => ({ event, weight: this.getEventWeight(event) }));
        const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
        let roll = Math.random() * totalWeight;
        let selected = weighted[weighted.length - 1].event;
        weighted.some((entry) => {
            roll -= entry.weight;
            if (roll <= 0) {
                selected = entry.event;
                return true;
            }
            return false;
        });
        const event = this.cloneData(selected);
        this.gameState.pendingEvent = event;
        this.gameState.recentEventIds = [...this.gameState.recentEventIds, event.id].slice(-4);
        return event;
    }

    resolveEventChoice(choiceIndex) {
        const event = this.gameState.pendingEvent;
        if (!event) return;
        const choice = event.choices[choiceIndex];
        if (!choice) return;
        if (this.gameState.politicalCapital < choice.cost) {
            this.showMessage('Not enough Political Capital for that response.', 'error');
            return;
        }

        this.gameState.politicalCapital -= choice.cost;
        this.applyEventEffects(choice.effects || {});
        const issuePressures = this.buildIssuePressures();
        this.applyNationalMoodDrift(issuePressures, 0.4);
        this.recalculateApproval();
        this.updateGovernmentStability();
        this.handleCabinetPressure();
        this.refreshCampaignState(issuePressures);
        this.recordPollSnapshot();
        this.gameState.events.unshift({
            title: event.title,
            description: event.description,
            impact: `${choice.label}: ${choice.summary}`
        });
        this.gameState.events = this.gameState.events.slice(0, 5);
        this.gameState.lastTurnSummary = `${this.gameState.lastTurnSummary} ${event.title}: ${choice.summary}`;
        this.logLedgerEntry(event.title, `${choice.label}. ${choice.summary}`, choice.tone || 'info');
        this.gameState.pendingEvent = null;

        if (!this.gameState.electionResolved && this.calculateMonthsToElection() === 0) {
            this.resolveElection();
        } else if (!this.gameState.electionResolved) {
            this.checkSpecialConditions();
        }

        this.updateDisplay();
        this.saveGame(false);
    }

    applyEventEffects(effects) {
        const difficulty = this.getDifficultyConfig();
        if (effects.approvalRating) {
            this.gameState.approvalRating = this.clamp(
                this.gameState.approvalRating + this.scaleByDifficulty(effects.approvalRating, difficulty.eventImpactMultiplier),
                0,
                100
            );
        }
        Object.entries(effects.voterApproval || {}).forEach(([group, delta]) => {
            this.gameState.voterApproval[group] = this.clamp(
                this.gameState.voterApproval[group] + this.scaleByDifficulty(delta, difficulty.eventImpactMultiplier),
                0,
                100
            );
        });
        Object.entries(effects.performanceMetrics || {}).forEach(([metric, delta]) => {
            if (typeof this.gameState.performanceMetrics[metric] === 'number') {
                this.gameState.performanceMetrics[metric] = this.clampMetric(
                    metric,
                    this.gameState.performanceMetrics[metric] + this.scaleByDifficulty(delta, difficulty.eventImpactMultiplier)
                );
            }
        });
        Object.entries(effects.regionalSupport || {}).forEach(([region, delta]) => {
            if (typeof this.gameState.regionalSupport[region] === 'number') {
                this.gameState.regionalSupport[region] = this.clamp(
                    this.gameState.regionalSupport[region] + this.scaleByDifficulty(delta, difficulty.eventImpactMultiplier),
                    15,
                    75
                );
            }
        });
        Object.entries(effects.cabinetLoyalty || {}).forEach(([portfolio, delta]) => {
            this.shiftCabinetLoyalty(portfolio, this.scaleByDifficulty(delta, difficulty.eventImpactMultiplier));
        });
        if (effects.politicalCapital) {
            this.gameState.politicalCapital = this.clamp(
                this.gameState.politicalCapital + this.scaleByDifficulty(effects.politicalCapital, difficulty.eventImpactMultiplier),
                0,
                150
            );
        }
        if (effects.governmentStability) {
            this.gameState.governmentStability = this.clamp(
                this.gameState.governmentStability + this.scaleByDifficulty(effects.governmentStability, difficulty.eventImpactMultiplier),
                0,
                100
            );
        }
    }

    recalculateApproval() {
        let total = 0;
        let weight = 0;
        Object.entries(this.voterGroups).forEach(([group, groupWeight]) => {
            total += this.gameState.voterApproval[group] * groupWeight;
            weight += groupWeight;
        });
        this.gameState.approvalRating = Math.round(total / weight);
        this.updateRegionalSupport();
    }

    updateRegionalSupport() {
        const regions = {
            'Scotland': [35, 0.8, { publicServices: 0.16, climate: 0.18, economy: 0.08, livingStandards: 0.08, immigration: 0.04, security: 0.06 }],
            'Northern England': [52, 0.6, { publicServices: 0.18, climate: 0.06, economy: 0.14, livingStandards: 0.18, immigration: 0.06, security: 0.08 }],
            'Midlands': [48, 0.7, { publicServices: 0.12, climate: 0.04, economy: 0.16, livingStandards: 0.17, immigration: 0.12, security: 0.12 }],
            'Wales': [45, 0.5, { publicServices: 0.18, climate: 0.14, economy: 0.1, livingStandards: 0.12, immigration: 0.04, security: 0.06 }],
            'London': [58, 0.4, { publicServices: 0.12, climate: 0.2, economy: 0.1, livingStandards: 0.1, immigration: 0.08, security: 0.05 }],
            'South': [38, 0.9, { publicServices: 0.08, climate: 0.06, economy: 0.18, livingStandards: 0.14, immigration: 0.14, security: 0.1 }]
        };
        const issuePressures = this.gameState.issuePressures || this.buildIssuePressures();
        Object.entries(regions).forEach(([region, [base, volatility, weights]]) => {
            const swing = (this.gameState.approvalRating - 42) * volatility;
            const authorityFactor = (this.gameState.governmentStability - 50) * 0.12;
            const issueFactor = Object.entries(weights).reduce((total, [issue, weight]) => {
                return total + (55 - issuePressures[issue]) * weight;
            }, 0);
            this.gameState.regionalSupport[region] = this.clamp(
                base + swing + authorityFactor + issueFactor + (Math.random() - 0.5) * 3,
                15,
                75
            );
        });
    }

    updatePerformanceMetrics() {
        this.gameState.performanceMetrics.nhsWaitingTimes = this.clampMetric(
            'nhsWaitingTimes',
            this.gameState.performanceMetrics.nhsWaitingTimes + (Math.random() - 0.42)
        );
        this.gameState.performanceMetrics.gdpGrowth = this.clampMetric(
            'gdpGrowth',
            this.gameState.performanceMetrics.gdpGrowth + (Math.random() - 0.5) * 0.45
        );
        this.gameState.performanceMetrics.unemployment = this.clampMetric(
            'unemployment',
            this.gameState.performanceMetrics.unemployment + (Math.random() - 0.48) * 0.25
        );
        this.gameState.performanceMetrics.educationStandards = this.clampMetric(
            'educationStandards',
            this.gameState.performanceMetrics.educationStandards + (Math.random() - 0.5) * 1.4
        );
        this.gameState.performanceMetrics.crimeRate = this.clampMetric(
            'crimeRate',
            this.gameState.performanceMetrics.crimeRate + (Math.random() - 0.48) * 1.2
        );
        this.gameState.performanceMetrics.climateProgress = this.clampMetric(
            'climateProgress',
            this.gameState.performanceMetrics.climateProgress + (Math.random() - 0.38) * 1.1
        );
    }

    generatePoliticalCapital() {
        let generation = 8;
        if (this.gameState.approvalRating > 50) generation += Math.floor((this.gameState.approvalRating - 50) / 10);
        else if (this.gameState.approvalRating < 40) generation -= Math.floor((40 - this.gameState.approvalRating) / 10);

        if (this.gameState.honeymoonMonths > 0) {
            generation += 4;
            this.gameState.honeymoonMonths -= 1;
        }

        const loyalCount = Object.values(this.gameState.cabinet).filter((minister) => minister.loyalty >= 65).length;
        generation += loyalCount * 0.5;
        if (this.gameState.emergencyPowers) generation -= 2;

        generation = Math.round(generation * this.getDifficultyConfig().politicalCapitalMultiplier);
        this.gameState.politicalCapital = this.clamp(this.gameState.politicalCapital + generation, 0, 150);
    }

    updateGovernmentStability() {
        const cabinetAverage = this.getAverageCabinetLoyalty();
        let target = 50
            + (this.gameState.approvalRating - 45) * 0.8
            + (this.gameState.politicalCapital - 50) * 0.2
            + (cabinetAverage - 60) * 0.18
            - this.gameState.implementationQueue.length * 2;
        if (this.gameState.emergencyPowers) target -= 8;
        if (this.gameState.performanceMetrics.gdpGrowth > 2.5) target += 3;
        if (this.gameState.performanceMetrics.unemployment > 6) target -= 4;
        target += this.getDifficultyConfig().stabilityDrift;

        this.gameState.governmentStability = this.clamp(
            Math.round(this.gameState.governmentStability * 0.35 + target * 0.65),
            0,
            100
        );
    }

    calculateProjectedSeats() {
        const issuePressures = this.gameState.issuePressures || this.buildIssuePressures();
        const averagePressure = Object.values(issuePressures).reduce((sum, value) => sum + value, 0) / Object.keys(issuePressures).length;
        const score = this.gameState.approvalRating
            + this.gameState.governmentStability * 0.35
            + this.getAverageCabinetLoyalty() * 0.08
            - Math.max(0, averagePressure - 48) * 0.42;
        return this.clamp(
            Math.round(138 + score * 2.05 + this.getDifficultyConfig().seatBonus),
            70,
            430
        );
    }

    calculateLegacyScore(projectedSeats = this.calculateProjectedSeats()) {
        const issuePressures = this.gameState.issuePressures || this.buildIssuePressures();
        const publicMoodScore = this.clamp(
            100 - (Object.values(issuePressures).reduce((sum, value) => sum + value, 0) / Object.keys(issuePressures).length),
            0,
            100
        );
        const servicesScore = this.clamp(
            100
            - (this.gameState.performanceMetrics.nhsWaitingTimes - 12) * 4
            + (this.gameState.policies.nhsFunding - 50) * 0.35
            + (this.gameState.policies.schoolFunding - 50) * 0.25,
            0,
            100
        );
        const economyScore = this.clamp(
            52
            + this.gameState.performanceMetrics.gdpGrowth * 8
            - this.gameState.performanceMetrics.unemployment * 5
            + Math.min(this.gameState.politicalCapital, 90) * 0.18,
            0,
            100
        );
        const authorityScore = this.clamp(
            this.gameState.governmentStability * 0.65 + this.getAverageCabinetLoyalty() * 0.35,
            0,
            100
        );
        const deliveryScore = this.clamp(
            this.gameState.deliveredPolicies * 8
            + this.gameState.implementationQueue.length * 4
            + this.gameState.turnNumber * 0.5,
            0,
            100
        );
        const seatScore = this.clamp((projectedSeats - 120) / 2.4, 0, 100);
        return Math.round(
            this.gameState.approvalRating * 0.23
            + this.gameState.governmentStability * 0.19
            + authorityScore * 0.12
            + servicesScore * 0.16
            + economyScore * 0.16
            + deliveryScore * 0.06
            + publicMoodScore * 0.08
            + seatScore * 0.08
        );
    }

    getAgendaStatus(progress) {
        if (progress >= 72) return 'On track';
        if (progress >= 55) return 'Manageable';
        if (progress >= 40) return 'Watch list';
        return 'Critical';
    }

    getAgendaTone(progress) {
        if (progress >= 72) return 'success';
        if (progress >= 55) return 'info';
        if (progress >= 40) return 'warning';
        return 'error';
    }

    buildAgendaItems() {
        const servicesProgress = this.clamp(
            48
            + (this.gameState.policies.nhsFunding - 50) * 0.45
            + (this.gameState.policies.socialCare - 40) * 0.35
            + (this.gameState.policies.schoolFunding - 55) * 0.25
            - (this.gameState.performanceMetrics.nhsWaitingTimes - 18) * 3.2,
            0,
            100
        );
        const economyProgress = this.clamp(
            52
            + this.gameState.performanceMetrics.gdpGrowth * 10
            - this.gameState.performanceMetrics.unemployment * 6
            + (this.gameState.politicalCapital - 50) * 0.18,
            0,
            100
        );
        const authorityProgress = this.clamp(
            this.gameState.governmentStability * 0.46
            + this.getAverageCabinetLoyalty() * 0.24
            + this.gameState.policies.policeFunding * 0.16
            + (100 - Math.abs(this.gameState.policies.immigration - 58) * 1.25) * 0.14,
            0,
            100
        );

        return [
            {
                title: 'Restore front-line services',
                owner: 'Streeting + Phillipson',
                progress: Math.round(servicesProgress),
                status: this.getAgendaStatus(servicesProgress),
                tone: this.getAgendaTone(servicesProgress),
                note: `NHS waits are ${Math.round(this.gameState.performanceMetrics.nhsWaitingTimes)} weeks and school funding is set at ${this.policyFormatters.schoolFunding(this.gameState.policies.schoolFunding)}.`
            },
            {
                title: 'Keep the economy steady',
                owner: 'Reeves + Treasury',
                progress: Math.round(economyProgress),
                status: this.getAgendaStatus(economyProgress),
                tone: this.getAgendaTone(economyProgress),
                note: `GDP is ${this.gameState.performanceMetrics.gdpGrowth.toFixed(1)}% with unemployment at ${this.gameState.performanceMetrics.unemployment.toFixed(1)}%.`
            },
            {
                title: 'Hold authority and control the narrative',
                owner: 'Cooper + No. 10',
                progress: Math.round(authorityProgress),
                status: this.getAgendaStatus(authorityProgress),
                tone: this.getAgendaTone(authorityProgress),
                note: `Government stability is ${this.gameState.governmentStability}% with cabinet loyalty averaging ${Math.round(this.getAverageCabinetLoyalty())}.`
            }
        ];
    }

    buildIssuePressures() {
        return {
            publicServices: this.clamp(
                26
                + this.gameState.performanceMetrics.nhsWaitingTimes * 2.2
                + (62 - this.gameState.performanceMetrics.educationStandards) * 0.55
                + (55 - this.gameState.policies.nhsFunding) * 0.22
                + (45 - this.gameState.policies.socialCare) * 0.18,
                10,
                95
            ),
            economy: this.clamp(
                34
                - this.gameState.performanceMetrics.gdpGrowth * 9
                + this.gameState.performanceMetrics.unemployment * 6.4
                + Math.max(0, this.gameState.policies.corporationTax - 27) * 1.1
                + Math.max(0, this.gameState.policies.incomeTax - 28) * 0.45,
                10,
                95
            ),
            livingStandards: this.clamp(
                30
                - this.gameState.performanceMetrics.gdpGrowth * 7
                + this.gameState.performanceMetrics.unemployment * 5.2
                + this.gameState.performanceMetrics.nhsWaitingTimes * 0.95
                + this.gameState.policies.incomeTax * 0.52,
                10,
                95
            ),
            immigration: this.clamp(
                26
                + Math.abs(this.gameState.policies.immigration - 52) * 0.85
                + Math.max(0, 42 - this.gameState.approvalRating) * 0.4
                + Math.max(0, 55 - this.getAverageCabinetLoyalty()) * 0.15,
                10,
                95
            ),
            climate: this.clamp(
                68
                - this.gameState.performanceMetrics.climateProgress
                + Math.max(0, 24 - this.gameState.performanceMetrics.gdpGrowth * 4)
                + Math.max(0, 23 - this.gameState.policies.corporationTax) * 0.5,
                10,
                95
            ),
            security: this.clamp(
                22
                + this.gameState.performanceMetrics.crimeRate * 1.05
                + Math.max(0, 58 - this.gameState.policies.policeFunding) * 0.34
                + Math.max(0, 52 - this.gameState.governmentStability) * 0.22,
                10,
                95
            )
        };
    }

    applyNationalMoodDrift(issuePressures, multiplier = 1) {
        const serviceRelief = (60 - issuePressures.publicServices) / 18;
        const economyRelief = (60 - issuePressures.economy) / 18;
        const livingRelief = (60 - issuePressures.livingStandards) / 18;
        const borderRelief = (60 - issuePressures.immigration) / 18;
        const climateRelief = (60 - issuePressures.climate) / 18;
        const securityRelief = (60 - issuePressures.security) / 18;
        const competenceRelief = ((this.gameState.governmentStability - 50) + (this.getAverageCabinetLoyalty() - 60)) / 22;
        const drift = {
            'Labour Supporters': serviceRelief * 0.9 + climateRelief * 0.4 + competenceRelief * 0.55 + livingRelief * 0.25,
            'Conservative Supporters': economyRelief * 0.7 + securityRelief * 0.55 + borderRelief * 0.45 + competenceRelief * 0.25,
            'LibDem Supporters': serviceRelief * 0.55 + climateRelief * 0.55 + economyRelief * 0.25 + competenceRelief * 0.4,
            'Reform Supporters': borderRelief * 0.95 + securityRelief * 0.45 + livingRelief * 0.25 + competenceRelief * 0.1,
            'Green Supporters': climateRelief * 1.15 + serviceRelief * 0.35 + competenceRelief * 0.2,
            'Floating Voters': economyRelief * 0.8 + livingRelief * 0.75 + serviceRelief * 0.65 + competenceRelief * 0.65 + securityRelief * 0.25
        };

        Object.entries(drift).forEach(([group, delta]) => {
            this.gameState.voterApproval[group] = this.clamp(
                this.gameState.voterApproval[group] + delta * multiplier,
                0,
                100
            );
        });
    }

    getPressureTone(score) {
        if (score >= 72) return 'error';
        if (score >= 56) return 'warning';
        if (score >= 40) return 'info';
        return 'success';
    }

    getIssueLabel(issueKey) {
        return {
            publicServices: 'Public services',
            economy: 'Economy',
            livingStandards: 'Living standards',
            immigration: 'Immigration',
            climate: 'Climate',
            security: 'Security'
        }[issueKey] || issueKey;
    }

    buildMediaNarrative(issuePressures) {
        const rankedIssues = Object.entries(issuePressures).sort((a, b) => b[1] - a[1]);
        const [topIssue, topScore] = rankedIssues[0];
        const [secondIssue] = rankedIssues[1];
        const weakestRegion = Object.entries(this.gameState.regionalSupport).sort((a, b) => a[1] - b[1])[0]?.[0] || 'the Midlands';
        const cabinetAverage = Math.round(this.getAverageCabinetLoyalty());
        const templates = {
            publicServices: {
                headline: 'Hospitals and schools remain the core test of competence.',
                summary: `Front-line delivery is dominating the argument, and the opposition believes the service state is where your government can still be broken.`,
                attack: `Opponents are targeting ${weakestRegion} with a simple line: the promises were louder than the delivery.`
            },
            economy: {
                headline: 'Growth and business confidence are setting the pace of politics.',
                summary: `Treasury credibility is back at the centre of Westminster, with every wobble in jobs or growth spilling straight into the polling conversation.`,
                attack: `Swing seats in ${weakestRegion} are being fought on whether ministers can actually keep the economy steady.`
            },
            livingStandards: {
                headline: 'The country is asking whether daily life feels easier yet.',
                summary: `Cost-of-living pressure is shaping the public mood more than abstract reform language, especially among loose voters who want proof, not process.`,
                attack: `The loudest attack line now is that ordinary households are still waiting for tangible relief in ${weakestRegion}.`
            },
            immigration: {
                headline: 'Border control is back on the front pages.',
                summary: `Migration and state authority are driving political attention, and small signals of drift are becoming much bigger than the underlying data.`,
                attack: `The government is being pressed hardest in ${weakestRegion}, where critics say ministers still do not look fully in command of the border brief.`
            },
            climate: {
                headline: 'Net zero credibility is shaping the modernising case.',
                summary: `Climate delivery is becoming a test of seriousness rather than just virtue, especially with younger and liberal voters watching for drift or retreat.`,
                attack: `Campaigns in ${weakestRegion} are starting to frame climate policy as a question of seriousness versus hesitation.`
            },
            security: {
                headline: 'Law, order, and authority are hardening into a political weather system.',
                summary: `Crime, visible disorder, and general confidence in the state are setting the backdrop for how every other argument lands.`,
                attack: `The hardest edge of the campaign is emerging in ${weakestRegion}, where voters are asking whether ministers still look in control.`
            }
        };
        const narrative = templates[topIssue];
        const tone = this.getPressureTone(topScore);

        return {
            headline: narrative.headline,
            summary: narrative.summary,
            tone,
            talkingPoints: [
                narrative.attack,
                `Cabinet cohesion is averaging ${cabinetAverage}, so party discipline is ${cabinetAverage >= 65 ? 'still a strength' : 'becoming part of the story'}.`,
                `The next visible gain needs to land on ${this.getIssueLabel(topIssue).toLowerCase()} before ${this.getIssueLabel(secondIssue).toLowerCase()} drags the conversation wider.`
            ]
        };
    }

    formatDateLabelFor(date) {
        return date.toLocaleString('en-GB', { month: 'short', year: 'numeric' });
    }

    formatDateLabel(date = this.gameState.currentDate) {
        return this.formatDateLabelFor(date);
    }

    refreshCampaignState(precomputedIssuePressures = null) {
        this.gameState.agendaItems = this.buildAgendaItems();
        this.gameState.issuePressures = precomputedIssuePressures || this.buildIssuePressures();
        this.gameState.mediaNarrative = this.buildMediaNarrative(this.gameState.issuePressures);
        this.gameState.legacyScore = this.calculateLegacyScore();
    }

    recordPollSnapshot() {
        const snapshot = {
            label: this.formatDateLabel(),
            approval: this.gameState.approvalRating,
            stability: this.gameState.governmentStability,
            projectedSeats: this.calculateProjectedSeats(),
            outlook: this.getElectionOutlook()
        };
        const history = Array.isArray(this.gameState.pollHistory) ? [...this.gameState.pollHistory] : [];
        const last = history[history.length - 1];
        if (last && last.label === snapshot.label) history[history.length - 1] = snapshot;
        else history.push(snapshot);
        this.gameState.pollHistory = history.slice(-12);
    }

    logLedgerEntry(title, detail, tone = 'info') {
        const nextEntry = {
            dateLabel: this.formatDateLabel(),
            title,
            detail,
            tone
        };
        const existing = Array.isArray(this.gameState.electionLedger) ? [...this.gameState.electionLedger] : [];
        const previous = existing[0];
        if (
            previous
            && previous.title === title
            && previous.dateLabel === nextEntry.dateLabel
            && previous.detail === detail
        ) {
            return;
        }
        this.gameState.electionLedger = [nextEntry, ...existing].slice(0, 16);
    }

    getElectionOutlook() {
        const score = this.gameState.approvalRating + this.gameState.governmentStability * 0.35;
        if (score >= 92) return 'Strong majority';
        if (score >= 82) return 'Narrow lead';
        if (score >= 74) return 'Hung parliament likely';
        if (score >= 66) return 'At risk';
        return 'Defeat looming';
    }

    buildTurnSummary(approvalDelta, changes, completed, event) {
        const parts = [];
        if (changes.changes.length) parts.push(`You spent ${changes.spent} political capital on ${changes.changes.length} policy change${changes.changes.length === 1 ? '' : 's'}.`);
        else parts.push('You held your policy line this month and conserved political capital.');
        if (completed.length) parts.push(`${completed.join(', ')} ${completed.length === 1 ? 'has' : 'have'} now taken effect.`);
        if (event) parts.push(`${event.title} has broken into the centre of the political agenda.`);
        if (approvalDelta > 0) parts.push(`National approval rose by ${approvalDelta} point${approvalDelta === 1 ? '' : 's'}.`);
        else if (approvalDelta < 0) parts.push(`National approval fell by ${Math.abs(approvalDelta)} point${Math.abs(approvalDelta) === 1 ? '' : 's'}.`);
        else parts.push('The national mood was broadly unchanged.');
        if (this.gameState.mediaNarrative?.headline) parts.push(`Narrative: ${this.gameState.mediaNarrative.headline}`);
        parts.push(`Election outlook: ${this.getElectionOutlook().toLowerCase()}.`);
        parts.push(`Legacy score now ${this.gameState.legacyScore}.`);
        return parts.join(' ');
    }

    checkSpecialConditions() {
        const difficulty = this.getDifficultyConfig();
        if (this.gameState.approvalRating < difficulty.confidenceThreshold) {
            this.gameState.confidenceWarnings += 1;
            this.gameState.emergencyPowers = true;
            if (this.gameState.confidenceWarnings === 1) {
                this.logLedgerEntry('Confidence crisis', 'Your authority is fraying and Westminster now smells blood.', 'error');
                this.showMessage('Your government is sliding toward a confidence crisis.', 'error');
            }
            if (
                this.gameState.confidenceWarnings >= 3
                && Math.random() < difficulty.noConfidenceChance * this.gameState.confidenceWarnings
            ) {
                this.resolveConfidenceCollapse();
                return true;
            }
        } else {
            if (this.gameState.emergencyPowers && this.gameState.approvalRating > difficulty.confidenceThreshold + 6) {
                this.gameState.emergencyPowers = false;
                this.logLedgerEntry(
                    'Confidence stabilised',
                    'The parliamentary panic has eased for now, and the government has stepped back from emergency footing.',
                    'success'
                );
            }
            this.gameState.confidenceWarnings = 0;
        }

        this.handleCabinetPressure();
        return false;
    }

    handleCabinetPressure() {
        const weakest = Object.entries(this.gameState.cabinet).sort((a, b) => a[1].loyalty - b[1].loyalty)[0];
        if (!weakest) return;
        const [, minister] = weakest;
        if (minister.loyalty >= 32) return;
        if (Math.random() >= 0.22) return;

        this.gameState.politicalCapital = this.clamp(this.gameState.politicalCapital - 6, 0, 150);
        minister.loyalty = this.clamp(minister.loyalty + 18, 0, 100);
        this.gameState.governmentStability = this.clamp(this.gameState.governmentStability - 2, 0, 100);
        this.logLedgerEntry(
            'Cabinet reshuffle',
            `${minister.name} had to be hauled back into line after weeks of destabilising briefings. The party regains some discipline, but at a political cost.`,
            'warning'
        );
        this.showMessage(`${minister.name} has triggered a reshuffle scare.`, 'warning');
    }

    resolveConfidenceCollapse() {
        const projectedSeats = this.calculateProjectedSeats();
        this.gameState.electionResolved = true;
        this.gameState.pendingEvent = null;
        this.gameState.legacyScore = this.calculateLegacyScore(projectedSeats);
        this.gameState.electionResult = {
            projectedSeats,
            outcome: 'Vote of No Confidence',
            summary: 'Your own side has concluded that the government cannot continue. The term ends in a parliamentary collapse.',
            legacyScore: this.gameState.legacyScore
        };
        this.gameState.lastTurnSummary = 'Your government has fallen after a vote of no confidence.';
        this.logLedgerEntry(
            'Government falls',
            `A confidence vote has ended the administration. You limp out with ${projectedSeats} projected seats and a legacy score of ${this.gameState.legacyScore}.`,
            'error'
        );
    }

    resolveElection() {
        const projectedSeats = this.calculateProjectedSeats();
        let outcome = 'Hung Parliament';
        let summary = 'You remain the largest party but will need partners to govern.';
        if (projectedSeats >= 326) {
            outcome = 'Majority Government';
            summary = 'You secured enough seats to govern outright and return to Downing Street with authority.';
        } else if (projectedSeats >= 290) {
            outcome = 'Minority Government';
            summary = 'You remain in office, but every vote in Parliament will be a fight.';
        } else if (projectedSeats <= 220) {
            outcome = 'Defeat';
            summary = 'The voters have turned against your government and the opposition is poised to take power.';
        }
        this.gameState.electionResolved = true;
        this.gameState.pendingEvent = null;
        this.gameState.legacyScore = this.calculateLegacyScore(projectedSeats);
        this.gameState.electionResult = { projectedSeats, outcome, summary, legacyScore: this.gameState.legacyScore };
        this.gameState.lastTurnSummary = `Election day has arrived. ${summary}`;
        this.logLedgerEntry(
            'Election day',
            `${summary} You finish on ${projectedSeats} projected seats with a legacy score of ${this.gameState.legacyScore}.`,
            outcome === 'Defeat' ? 'error' : 'success'
        );
    }

    updateDisplay() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const projectedSeats = this.calculateProjectedSeats();
        const scenario = this.scenarios[this.gameState.scenarioId];

        document.getElementById('currentDate').textContent = `${months[this.gameState.currentDate.getMonth()]} ${this.gameState.currentDate.getFullYear()}`;
        document.getElementById('electionCountdown').textContent = `${this.calculateMonthsToElection()} months`;
        document.getElementById('approvalRating').textContent = `${this.gameState.approvalRating}%`;
        document.getElementById('politicalCapital').textContent = Math.round(this.gameState.politicalCapital);
        document.getElementById('emergencyStatus').textContent = this.gameState.emergencyPowers ? 'Active' : 'Inactive';
        document.getElementById('turnSummary').textContent = this.gameState.lastTurnSummary;
        document.getElementById('governmentStability').textContent = `${this.gameState.governmentStability}%`;
        document.getElementById('electionOutlook').textContent = this.getElectionOutlook();
        document.getElementById('legacyScore').textContent = `${this.gameState.legacyScore}`;
        document.getElementById('projectedSeatsLive').textContent = `${projectedSeats}`;
        document.getElementById('gameStatusBadge').textContent = this.gameState.electionResolved ? 'Election Complete' : 'In Office';
        document.getElementById('nextTurnBtn').disabled = this.gameState.electionResolved || Boolean(this.gameState.pendingEvent);
        document.getElementById('scenarioTag').textContent = scenario?.name || 'Campaign';
        document.getElementById('difficultyTag').textContent = this.getDifficultyConfig().label;
        document.querySelector('.pm-name').textContent = this.gameState.pmName;
        document.querySelector('.party-info').textContent = this.gameState.partyInfo;

        Object.entries(this.gameState.voterApproval).forEach(([group, approval]) => {
            const groupElement = Array.from(document.querySelectorAll('.voter-group')).find((element) => {
                const label = element.querySelector('.group-name');
                return label && label.textContent.includes(group);
            });
            if (!groupElement) return;
            groupElement.querySelector('.approval-fill').style.width = `${approval}%`;
            groupElement.querySelector('.approval-text').textContent = `${Math.round(approval)}%`;
        });

        this.updateRegionalMapDisplay();

        const nhsMetric = document.querySelector('#metricNhsWaitingTimes .metric-value');
        nhsMetric.textContent = `${Math.round(this.gameState.performanceMetrics.nhsWaitingTimes)} weeks`;
        nhsMetric.className = `metric-value ${this.getStatusClass(this.gameState.performanceMetrics.nhsWaitingTimes, [17, 21], true)}`;

        const educationMetric = document.querySelector('#metricEducation .metric-value');
        educationMetric.textContent = this.describeEducationStandards();
        educationMetric.className = `metric-value ${this.getStatusClass(this.gameState.performanceMetrics.educationStandards, [48, 62])}`;

        const crimeMetric = document.querySelector('#metricCrime .metric-value');
        crimeMetric.textContent = this.describeCrimeRate();
        crimeMetric.className = `metric-value ${this.getStatusClass(this.gameState.performanceMetrics.crimeRate, [46, 54], true)}`;

        const gdpMetric = document.querySelector('#metricGdpGrowth .metric-value');
        gdpMetric.textContent = `${this.gameState.performanceMetrics.gdpGrowth.toFixed(1)}%`;
        gdpMetric.className = `metric-value ${this.getStatusClass(this.gameState.performanceMetrics.gdpGrowth, [0.8, 2.2])}`;

        const unemploymentMetric = document.querySelector('#metricUnemployment .metric-value');
        unemploymentMetric.textContent = `${this.gameState.performanceMetrics.unemployment.toFixed(1)}%`;
        unemploymentMetric.className = `metric-value ${this.getStatusClass(this.gameState.performanceMetrics.unemployment, [4.5, 6.5], true)}`;

        const climateMetric = document.querySelector('#metricClimate .metric-value');
        climateMetric.textContent = this.describeClimateProgress();
        climateMetric.className = `metric-value ${this.getStatusClass(this.gameState.performanceMetrics.climateProgress, [34, 46])}`;

        this.updateAgendaDisplay();
        this.updatePollHistoryDisplay();
        this.updateNationalMoodDisplay();
        this.updateEventsDisplay();
        this.updateQueueDisplay();
        this.updateElectionLedgerDisplay();
        this.updateCabinetDisplay();
        this.updateElectionModal();
        this.updateEventModal();
    }

    getRegionTone(support) {
        if (support >= 55) return 'success';
        if (support >= 46) return 'info';
        if (support >= 38) return 'warning';
        return 'error';
    }

    getRegionalSeatEstimate(region, support = this.gameState.regionalSupport[region]) {
        const seatPools = {
            'Scotland': 57,
            'Northern England': 118,
            'Midlands': 108,
            'Wales': 32,
            'London': 75,
            'South': 220
        };
        const pool = seatPools[region] || 50;
        const share = this.clamp((support - 22) / 46, 0.05, 0.88);
        return Math.round(pool * share);
    }

    updateRegionalMapDisplay() {
        const map = document.getElementById('regionalMap');
        const list = document.getElementById('regionalSupportList');
        if (!map || !list) return;
        const regions = [
            { key: 'Scotland', label: 'Scotland', short: 'SCO', x: 24, y: 15 },
            { key: 'Northern England', label: 'North', short: 'NTH', x: 38, y: 36 },
            { key: 'Midlands', label: 'Midlands', short: 'MID', x: 41, y: 54 },
            { key: 'Wales', label: 'Wales', short: 'WAL', x: 24, y: 57 },
            { key: 'London', label: 'London', short: 'LDN', x: 57, y: 71 },
            { key: 'South', label: 'South', short: 'STH', x: 48, y: 82 }
        ];
        const strongest = regions.reduce((best, region) => {
            const support = this.gameState.regionalSupport[region.key];
            if (!best || support > best.support) return { region: region.key, support };
            return best;
        }, null);
        const weakest = regions.reduce((worst, region) => {
            const support = this.gameState.regionalSupport[region.key];
            if (!worst || support < worst.support) return { region: region.key, support };
            return worst;
        }, null);

        map.innerHTML = `
            <svg class="uk-map__frame" viewBox="0 0 420 320" role="img" aria-label="Stylised map of Britain showing regional government support">
                <defs>
                    <linearGradient id="mapGlow" x1="0%" x2="100%" y1="0%" y2="100%">
                        <stop offset="0%" stop-color="rgba(8, 22, 40, 0.95)"></stop>
                        <stop offset="100%" stop-color="rgba(22, 58, 92, 0.72)"></stop>
                    </linearGradient>
                </defs>
                <path class="uk-map__silhouette" d="M130 18 C100 24 84 48 92 79 C78 97 74 121 94 142 C87 166 98 189 122 206 C127 231 145 253 170 261 C192 281 219 290 246 279 C270 290 294 279 309 256 C332 247 347 225 349 198 C362 176 359 152 343 132 C350 108 343 85 323 70 C317 45 298 28 273 24 C243 12 214 11 188 22 C168 14 149 14 130 18 Z"></path>
                <path class="uk-map__silhouette uk-map__silhouette--inner" d="M141 42 C118 48 107 69 113 92 C102 106 100 124 114 141 C109 158 117 177 135 190 C142 211 156 226 177 232 C194 249 216 255 237 247 C257 255 279 248 292 229 C311 222 324 206 325 185 C336 169 333 150 320 136 C325 117 319 98 302 86 C297 67 281 54 262 50 C236 40 214 40 192 48 C174 40 156 38 141 42 Z"></path>
            </svg>
            ${regions.map((region) => {
                const support = Math.round(this.gameState.regionalSupport[region.key]);
                const seats = this.getRegionalSeatEstimate(region.key, support);
                const tone = this.getRegionTone(support);
                const pulse = 44 + Math.round((support - 15) * 0.55);
                return `
                    <button
                        type="button"
                        class="region-node region-node--${tone}"
                        data-region="${region.key}"
                        style="left:${region.x}%; top:${region.y}%; width:${pulse}px; height:${pulse}px;"
                    >
                        <span class="region-node__name">${region.short}</span>
                        <span class="region-node__value">${support}%</span>
                        <span class="region-node__seats">${seats} seats</span>
                    </button>
                `;
            }).join('')}
            <div class="uk-map__caption">
                <span>Strongest region: ${strongest.region} (${Math.round(strongest.support)}%)</span>
                <span>Weakest region: ${weakest.region} (${Math.round(weakest.support)}%)</span>
            </div>
        `;

        list.innerHTML = regions.map((region) => {
            const support = Math.round(this.gameState.regionalSupport[region.key]);
            const seats = this.getRegionalSeatEstimate(region.key, support);
            const tone = this.getRegionTone(support);
            return `
                <button type="button" class="regional-list-item regional-list-item--${tone}" data-region="${region.key}">
                    <div class="regional-list-item__head">
                        <strong>${region.label}</strong>
                        <span>${support}%</span>
                    </div>
                    <div class="regional-list-item__bar"><span style="width:${support}%"></span></div>
                    <div class="regional-list-item__meta">
                        <span>${seats} projected seats</span>
                        <span>${tone === 'success' ? 'Strong' : tone === 'info' ? 'Competitive' : tone === 'warning' ? 'Soft' : 'Fragile'}</span>
                    </div>
                </button>
            `;
        }).join('');
    }

    updateAgendaDisplay() {
        const list = document.getElementById('governmentAgenda');
        if (!list) return;
        list.innerHTML = '';
        this.gameState.agendaItems.forEach((item) => {
            const node = document.createElement('article');
            node.className = 'agenda-item';
            node.innerHTML = `
                <div class="agenda-head">
                    <div>
                        <h3>${item.title}</h3>
                        <p>${item.owner}</p>
                    </div>
                    <span class="agenda-status status status--${item.tone}">${item.status}</span>
                </div>
                <div class="agenda-progress">
                    <div class="agenda-bar"><div class="agenda-fill agenda-fill--${item.tone}" style="width: ${item.progress}%"></div></div>
                    <span>${item.progress}%</span>
                </div>
                <p class="agenda-note">${item.note}</p>
            `;
            list.appendChild(node);
        });
    }

    updatePollHistoryDisplay() {
        const container = document.getElementById('pollHistory');
        if (!container) return;
        const history = Array.isArray(this.gameState.pollHistory) ? this.gameState.pollHistory.slice(-8) : [];
        if (!history.length) {
            container.innerHTML = '<div class="poll-empty">Polling data will appear after your first month in office.</div>';
            return;
        }
        const width = 360;
        const height = 120;
        const padding = 18;
        const xStep = history.length > 1 ? (width - padding * 2) / (history.length - 1) : 0;
        const approvalPoints = history.map((entry, index) => `${padding + index * xStep},${height - padding - ((entry.approval - 20) / 60) * (height - padding * 2)}`).join(' ');
        const seatPoints = history.map((entry, index) => `${padding + index * xStep},${height - padding - ((entry.projectedSeats - 150) / 220) * (height - padding * 2)}`).join(' ');
        const recentRows = history.slice().reverse().map((entry) => `
            <div class="poll-row">
                <span>${entry.label}</span>
                <strong>${entry.approval}%</strong>
                <span>${entry.projectedSeats} seats</span>
            </div>
        `).join('');
        container.innerHTML = `
            <div class="poll-chart-frame">
                <svg viewBox="0 0 ${width} ${height}" class="poll-chart" role="img" aria-label="Polling history chart">
                    <polyline class="poll-line poll-line--approval" points="${approvalPoints}"></polyline>
                    <polyline class="poll-line poll-line--seats" points="${seatPoints}"></polyline>
                </svg>
            </div>
            <div class="poll-legend">
                <span><i class="poll-key poll-key--approval"></i> Approval</span>
                <span><i class="poll-key poll-key--seats"></i> Seat projection</span>
            </div>
            <div class="poll-rows">${recentRows}</div>
        `;
    }

    updateNationalMoodDisplay() {
        const pressureList = document.getElementById('issuePressureList');
        const headline = document.getElementById('mediaNarrativeHeadline');
        const summary = document.getElementById('mediaNarrativeSummary');
        const talkingPoints = document.getElementById('mediaTalkingPoints');
        if (!pressureList || !headline || !summary || !talkingPoints) return;

        const issuePressures = this.gameState.issuePressures || this.buildIssuePressures();
        const rankedIssues = Object.entries(issuePressures).sort((a, b) => b[1] - a[1]);
        pressureList.innerHTML = rankedIssues.map(([issue, score]) => {
            const tone = this.getPressureTone(score);
            return `
                <article class="issue-pressure issue-pressure--${tone}">
                    <div class="issue-pressure__head">
                        <strong>${this.getIssueLabel(issue)}</strong>
                        <span>${Math.round(score)}</span>
                    </div>
                    <div class="issue-pressure__bar"><span style="width:${Math.round(score)}%"></span></div>
                    <p>${tone === 'error' ? 'Dominating coverage' : tone === 'warning' ? 'Rising fast' : tone === 'info' ? 'Manageable' : 'Under control'}</p>
                </article>
            `;
        }).join('');

        headline.textContent = this.gameState.mediaNarrative?.headline || 'The political weather is still forming.';
        summary.textContent = this.gameState.mediaNarrative?.summary || 'Voters are still deciding what matters most.';
        talkingPoints.innerHTML = (this.gameState.mediaNarrative?.talkingPoints || []).map((point) => `<li>${point}</li>`).join('');
    }

    updateEventsDisplay() {
        const eventsList = document.getElementById('eventsList');
        eventsList.innerHTML = '';
        this.gameState.events.forEach((event) => {
            const node = document.createElement('div');
            node.className = 'event-item';
            node.innerHTML = `<div class="event-title">${event.title}</div><div class="event-description">${event.description}</div><div class="event-impact">${event.impact}</div>`;
            eventsList.appendChild(node);
        });
    }

    updateQueueDisplay() {
        const queue = document.getElementById('implementationQueue');
        queue.innerHTML = '';
        if (!this.gameState.implementationQueue.length) {
            queue.innerHTML = '<div class="queue-item">No policies currently being implemented</div>';
            return;
        }
        this.gameState.implementationQueue.forEach((item) => {
            const node = document.createElement('div');
            node.className = 'queue-item';
            node.innerHTML = `
                <div class="queue-policy">${item.policy}</div>
                <div class="queue-progress">
                    <div class="progress-bar"><div class="progress-fill" style="width:${item.progress}%"></div></div>
                    <span class="progress-text">${item.monthsRemaining} ${item.monthsRemaining === 1 ? 'month' : 'months'} remaining</span>
                </div>
            `;
            queue.appendChild(node);
        });
    }

    updateElectionLedgerDisplay() {
        const list = document.getElementById('electionLedger');
        if (!list) return;
        list.innerHTML = '';
        this.gameState.electionLedger.forEach((entry) => {
            const node = document.createElement('article');
            node.className = 'ledger-entry';
            node.innerHTML = `
                <div class="ledger-meta">
                    <span class="ledger-date">${entry.dateLabel}</span>
                    <span class="status status--${entry.tone}">${entry.title}</span>
                </div>
                <p>${entry.detail}</p>
            `;
            list.appendChild(node);
        });
    }

    updateCabinetDisplay() {
        const list = document.getElementById('cabinetList');
        if (!list) return;
        list.innerHTML = '';
        Object.values(this.gameState.cabinet).forEach((minister) => {
            const tone = this.getCabinetTone(minister.loyalty);
            const item = document.createElement('div');
            item.className = 'minister-item';
            item.innerHTML = `
                <div class="minister-copy">
                    <span class="minister-name">${minister.name}</span>
                    <span class="minister-role">${minister.role}</span>
                </div>
                <div class="minister-meta">
                    <span class="minister-score">${Math.round(minister.loyalty)}</span>
                    <span class="minister-loyalty status status--${tone}">${this.describeCabinetLoyalty(minister.loyalty)}</span>
                </div>
            `;
            list.appendChild(item);
        });
    }

    updateElectionModal() {
        const modal = document.getElementById('electionModal');
        if (!this.gameState.electionResolved || !this.gameState.electionResult) {
            modal.classList.add('hidden');
            return;
        }
        document.getElementById('electionResultTitle').textContent = this.gameState.electionResult.outcome;
        document.getElementById('electionResultSummary').textContent = this.gameState.electionResult.summary;
        document.getElementById('electionResultSeats').textContent = `${this.gameState.electionResult.projectedSeats}`;
        document.getElementById('electionResultOutcome').textContent = this.gameState.electionResult.outcome;
        document.getElementById('electionResultLegacy').textContent = `${this.gameState.electionResult.legacyScore ?? this.gameState.legacyScore}`;
        modal.classList.remove('hidden');
    }

    updateEventModal() {
        const modal = document.getElementById('eventModal');
        if (!this.gameState.pendingEvent) {
            modal.classList.add('hidden');
            return;
        }
        const event = this.gameState.pendingEvent;
        document.getElementById('eventCategory').textContent = event.category;
        document.getElementById('eventTitle').textContent = event.title;
        document.getElementById('eventDescription').textContent = event.description;
        document.getElementById('eventImpactSummary').textContent = event.impact;
        const choiceList = document.getElementById('eventChoices');
        choiceList.innerHTML = '';
        event.choices.forEach((choice, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `event-choice event-choice--${choice.tone}`;
            button.disabled = this.gameState.politicalCapital < choice.cost;
            button.innerHTML = `
                <div class="event-choice__head">
                    <strong>${choice.label}</strong>
                    <span>Cost: ${choice.cost} PC</span>
                </div>
                <p>${choice.summary}</p>
            `;
            button.addEventListener('click', () => this.resolveEventChoice(index));
            choiceList.appendChild(button);
        });
        modal.classList.remove('hidden');
    }

    openEventModal() {
        this.updateEventModal();
    }

    showHelpModal() {
        document.getElementById('helpModal').classList.remove('hidden');
    }

    hideHelpModal(markSeen = false) {
        document.getElementById('helpModal').classList.add('hidden');
        if (markSeen) localStorage.setItem(this.helpSeenKey, 'true');
    }

    openScenarioModal(lockToFreshStart = false) {
        this.scenarioSelection = {
            scenarioId: this.gameState.scenarioId || 'labour-2025',
            difficulty: this.gameState.difficulty || 'normal'
        };
        this.renderScenarioSelection();
        document.getElementById('scenarioModal').classList.remove('hidden');
        document.getElementById('scenarioCancelBtn').style.display = lockToFreshStart ? 'none' : 'inline-flex';
    }

    renderScenarioSelection() {
        document.querySelectorAll('.scenario-option').forEach((button) => {
            button.classList.toggle('scenario-option--active', button.dataset.scenario === this.scenarioSelection.scenarioId);
        });
        document.querySelectorAll('.difficulty-option').forEach((button) => {
            button.classList.toggle('difficulty-option--active', button.dataset.difficulty === this.scenarioSelection.difficulty);
        });
    }

    closeScenarioModal() {
        document.getElementById('scenarioModal').classList.add('hidden');
    }

    confirmScenarioSelection() {
        this.startScenario(this.scenarioSelection.scenarioId, this.scenarioSelection.difficulty);
        this.closeScenarioModal();
    }

    startScenario(scenarioId, difficulty) {
        this.gameState = this.createInitialState({ scenarioId, difficulty });
        this.refreshCampaignState();
        this.recordPollSnapshot();
        this.syncSliders();
        this.updatePolicyCosts();
        this.updateDisplay();
        this.saveGame(false);
        this.showMessage(`${this.scenarios[scenarioId].name} is now live on ${this.difficulties[difficulty].label}.`, 'info');
    }

    calculateMonthsToElection() {
        return Math.max(
            0,
            (this.gameState.electionDate.getFullYear() - this.gameState.currentDate.getFullYear()) * 12
            + (this.gameState.electionDate.getMonth() - this.gameState.currentDate.getMonth())
        );
    }

    saveGame(showToast) {
        const serialisable = {
            ...this.gameState,
            currentDate: this.gameState.currentDate.toISOString(),
            electionDate: this.gameState.electionDate.toISOString()
        };
        localStorage.setItem(this.storageKey, JSON.stringify(serialisable));
        if (showToast) this.showMessage('Government progress saved locally.', 'success');
    }

    loadGame() {
        const raw = localStorage.getItem(this.storageKey)
            || this.legacyStorageKeys.map((key) => localStorage.getItem(key)).find(Boolean);
        if (!raw) return;
        try {
            const parsed = JSON.parse(raw);
            const scenarioId = parsed.scenarioId || 'labour-2025';
            const difficulty = parsed.difficulty || 'normal';
            const initial = this.createInitialState({ scenarioId, difficulty });
            this.gameState = {
                ...initial,
                ...parsed,
                version: 4,
                currentDate: parsed.currentDate ? new Date(parsed.currentDate) : initial.currentDate,
                electionDate: parsed.electionDate ? new Date(parsed.electionDate) : initial.electionDate,
                policies: { ...initial.policies, ...(parsed.policies || {}) },
                voterApproval: { ...initial.voterApproval, ...(parsed.voterApproval || {}) },
                regionalSupport: { ...initial.regionalSupport, ...(parsed.regionalSupport || {}) },
                performanceMetrics: { ...initial.performanceMetrics, ...(parsed.performanceMetrics || {}) },
                cabinet: this.normaliseCabinet(parsed.cabinet || parsed.cabinetLoyalty, initial.cabinet),
                pollHistory: Array.isArray(parsed.pollHistory) && parsed.pollHistory.length ? parsed.pollHistory : initial.pollHistory,
                electionLedger: Array.isArray(parsed.electionLedger) && parsed.electionLedger.length ? parsed.electionLedger : initial.electionLedger,
                implementationQueue: Array.isArray(parsed.implementationQueue) ? parsed.implementationQueue : initial.implementationQueue,
                events: Array.isArray(parsed.events) && parsed.events.length ? parsed.events : initial.events,
                pendingEvent: parsed.pendingEvent || null,
                recentEventIds: Array.isArray(parsed.recentEventIds) ? parsed.recentEventIds : []
            };
            this.scenarioSelection = {
                scenarioId: this.gameState.scenarioId,
                difficulty: this.gameState.difficulty
            };
            this.refreshCampaignState();
            if (!this.gameState.pendingEvent) this.recordPollSnapshot();
        } catch {
            localStorage.removeItem(this.storageKey);
            this.legacyStorageKeys.forEach((key) => localStorage.removeItem(key));
            this.gameState = this.createInitialState(this.scenarioSelection);
        }
    }

    normaliseCabinet(parsedCabinet, fallbackCabinet) {
        const cabinet = this.cloneData(fallbackCabinet);
        if (!parsedCabinet) return cabinet;
        if (typeof parsedCabinet.health === 'object') {
            Object.entries(cabinet).forEach(([portfolio, defaultMinister]) => {
                const parsedMinister = parsedCabinet[portfolio];
                if (!parsedMinister) return;
                cabinet[portfolio] = {
                    ...defaultMinister,
                    ...parsedMinister,
                    loyalty: this.clamp(parsedMinister.loyalty ?? defaultMinister.loyalty, 0, 100)
                };
            });
            return cabinet;
        }
        Object.entries(cabinet).forEach(([portfolio, minister]) => {
            const oldValue = parsedCabinet[minister.name];
            if (typeof oldValue === 'number') cabinet[portfolio].loyalty = this.clamp(oldValue, 0, 100);
            else if (typeof oldValue === 'string') cabinet[portfolio].loyalty = this.mapLegacyCabinetStatus(oldValue);
        });
        return cabinet;
    }

    mapLegacyCabinetStatus(status) {
        if (status === 'Loyal') return 76;
        if (status === 'Neutral') return 58;
        if (status === 'Restless') return 42;
        return 50;
    }

    resetGame(force = false) {
        if (!force && !window.confirm('Choose a new scenario and overwrite the current save?')) return;
        this.openScenarioModal();
    }

    showRegionDetails(region) {
        if (!region) return;
        const support = Math.round(this.gameState.regionalSupport[region]);
        const projected = Math.round(this.calculateProjectedSeats() * (support / 100) * 0.1);
        this.showMessage(`${region}: ${support}% government support. Rough local seat strength: ${projected}.`, 'info');
    }

    showMessage(message, type) {
        const toast = document.createElement('div');
        toast.className = `status status--${type}`;
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: '1000',
            padding: '12px 16px',
            borderRadius: '8px',
            maxWidth: '320px'
        });
        toast.textContent = message;
        document.body.appendChild(toast);
        window.setTimeout(() => toast.remove(), 3000);
    }

    getDifficultyConfig() {
        return this.difficulties[this.gameState.difficulty] || this.difficulties.normal;
    }

    getAverageCabinetLoyalty() {
        const ministers = Object.values(this.gameState.cabinet);
        return ministers.reduce((total, minister) => total + minister.loyalty, 0) / ministers.length;
    }

    shiftCabinetLoyalty(portfolio, delta) {
        if (!this.gameState.cabinet[portfolio]) return;
        this.gameState.cabinet[portfolio].loyalty = this.clamp(this.gameState.cabinet[portfolio].loyalty + delta, 0, 100);
    }

    getCabinetTone(score) {
        if (score >= 72) return 'success';
        if (score >= 55) return 'info';
        if (score >= 38) return 'warning';
        return 'error';
    }

    describeCabinetLoyalty(score) {
        if (score >= 78) return 'Stalwart';
        if (score >= 65) return 'Loyal';
        if (score >= 50) return 'Manageable';
        if (score >= 35) return 'Restless';
        return 'Rebellious';
    }

    describeEducationStandards() {
        const value = this.gameState.performanceMetrics.educationStandards;
        if (value >= 62) return 'Improving';
        if (value >= 50) return 'Steady';
        return 'Under pressure';
    }

    describeCrimeRate() {
        const value = this.gameState.performanceMetrics.crimeRate;
        if (value <= 46) return 'Falling';
        if (value <= 54) return 'Stable';
        return 'Rising';
    }

    describeClimateProgress() {
        const value = this.gameState.performanceMetrics.climateProgress;
        if (value >= 46) return 'Ahead of target';
        if (value >= 34) return 'On track';
        return 'Behind target';
    }

    getStatusClass(value, thresholds, lowerIsBetter = false) {
        const [warningThreshold, successThreshold] = thresholds;
        if (lowerIsBetter) {
            if (value <= warningThreshold) return 'status--success';
            if (value <= successThreshold) return 'status--warning';
            return 'status--error';
        }
        if (value >= successThreshold) return 'status--success';
        if (value >= warningThreshold) return 'status--warning';
        return 'status--error';
    }

    clampMetric(metric, value) {
        const ranges = {
            nhsWaitingTimes: [10, 32],
            educationStandards: [35, 80],
            crimeRate: [35, 70],
            gdpGrowth: [-2.5, 5.5],
            unemployment: [2, 12],
            climateProgress: [10, 80]
        };
        const [min, max] = ranges[metric] || [-999, 999];
        return this.clamp(value, min, max);
    }

    scaleByDifficulty(value, multiplier) {
        return Math.round(value * multiplier * 10) / 10;
    }

    cloneData(value) {
        return JSON.parse(JSON.stringify(value));
    }

    clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }
}

document.addEventListener('DOMContentLoaded', () => new UKDemocracySimulator());
