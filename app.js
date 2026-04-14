class UKDemocracySimulator {
    constructor() {
        this.storageKey = 'mandate-2029-state-v5';
        this.legacyStorageKeys = [
            'mandate-2029-state-v4',
            'uk-democracy-simulator-state-v4',
            'uk-democracy-simulator-state-v3',
            'uk-democracy-simulator-state-v2',
            'uk-democracy-simulator-state'
        ];
        this.helpSeenKey = 'mandate-2029-help-seen';
        this.settingsKey = 'mandate-2029-settings-v1';
        this.tutorialDismissedKey = 'mandate-2029-tutorial-dismissed';
        this.defaultScenarioId = 'long-campaign';
        this.query = new URLSearchParams(window.location.search);
        this.debugAutoStart = this.query.get('autostart') === '1';
        this.reviewMode = this.query.get('review') === '1';
        this.reviewScenarioId = this.query.get('scenario') || this.defaultScenarioId;
        this.reviewDifficulty = this.query.get('difficulty') || 'normal';
        this.reviewState = ['event', 'run-in', 'result'].includes(this.query.get('state'))
            ? this.query.get('state')
            : 'opening';
        this.reviewTutorialDismissed = this.reviewState !== 'opening';
        this.hasPersistedSave = false;
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
        // Normalise legacy currency text after Windows encoding hiccups in the base source.
        this.policyFormatters.nhsFunding = (value) => `GBP ${(215.6 + (value - 50) * 2).toFixed(1)}bn`;
        this.policyFormatters.schoolFunding = (value) => `GBP ${(59.6 + (value - 55) * 1.5).toFixed(1)}bn`;
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
        this.factionProfiles = {
            service: {
                name: 'Service Bloc',
                description: 'Front-line ministers, mayors, and soft-left MPs who want visible state capacity.'
            },
            treasury: {
                name: 'Treasury Hawks',
                description: 'Fiscal disciplinarians who panic when the government looks expensive or chaotic.'
            },
            security: {
                name: 'Authority Caucus',
                description: 'MPs and advisers focused on migration, order, and visible grip.'
            },
            green: {
                name: 'Green Modernisers',
                description: 'The growth-and-climate wing that wants the future to feel tangible rather than rhetorical.'
            }
        };
        this.scenarios = this.createScenarios();
        this.difficulties = this.createDifficulties();
        this.eventTemplates = this.createEventTemplates();
        this.settings = this.loadSettings();
        if (this.reviewMode) {
            this.settings = {
                ...this.createDefaultSettings(),
                musicEnabled: false,
                sfxEnabled: false,
                reducedMotion: false
            };
        }
        this.audio = {
            context: null,
            master: null,
            musicGain: null,
            musicNodes: [],
            musicPulseTimer: null,
            lastEventCueId: null,
            lastElectionCueKey: null
        };
        this.scenarioSelection = {
            scenarioId: this.reviewMode ? this.reviewScenarioId : this.defaultScenarioId,
            difficulty: this.reviewMode ? this.reviewDifficulty : 'normal'
        };
        this.gameState = this.createInitialState(this.scenarioSelection);
        if (!this.reviewMode) {
            this.loadGame();
        }
        this.init();
    }

    createScenarios() {
        return {
            'long-campaign': {
                id: 'long-campaign',
                name: 'The Long Campaign',
                description: 'August 2027. Two years to election day. The public wants proof of competence, not another clean argument.',
                titleDescription: 'The featured demo campaign: a 24-month sprint from brittle authority to election night.',
                partyInfo: 'Labour Government',
                pmName: 'Prime Minister: Keir Starmer',
                currentDate: [2027, 7, 1],
                electionDate: [2029, 7, 1],
                politicalCapital: 62,
                approvalRating: 39,
                governmentStability: 51,
                honeymoonMonths: 0,
                policies: {
                    nhsFunding: 56,
                    socialCare: 42,
                    schoolFunding: 58,
                    higherEd: 44,
                    incomeTax: 22,
                    corporationTax: 25,
                    policeFunding: 61,
                    immigration: 47
                },
                voterApproval: {
                    'Labour Supporters': 63,
                    'Conservative Supporters': 21,
                    'LibDem Supporters': 39,
                    'Reform Supporters': 15,
                    'Green Supporters': 47,
                    'Floating Voters': 31
                },
                regionalSupport: {
                    'Scotland': 32,
                    'Northern England': 47,
                    'Midlands': 43,
                    'Wales': 41,
                    'London': 55,
                    'South': 33
                },
                performanceMetrics: {
                    nhsWaitingTimes: 21,
                    educationStandards: 55,
                    crimeRate: 49,
                    gdpGrowth: 1.3,
                    unemployment: 5.0,
                    climateProgress: 40
                },
                cabinetLoyalty: {
                    health: 63,
                    treasury: 57,
                    home: 54,
                    education: 61,
                    energy: 58,
                    whip: 56
                },
                factions: {
                    service: 60,
                    treasury: 50,
                    security: 46,
                    green: 53
                },
                implementationQueue: [
                    {
                        policy: 'Neighbourhood Health Recovery',
                        progress: 48,
                        monthsRemaining: 2,
                        effect: {
                            voterApproval: { 'Labour Supporters': 3, 'Floating Voters': 2 },
                            metrics: { nhsWaitingTimes: -1.6 },
                            governmentStability: 2
                        }
                    },
                    {
                        policy: 'Skills and Schools Push',
                        progress: 28,
                        monthsRemaining: 3,
                        effect: {
                            voterApproval: { 'LibDem Supporters': 2, 'Green Supporters': 1, 'Floating Voters': 1 },
                            metrics: { educationStandards: 1.4 },
                            governmentStability: 1
                        }
                    }
                ],
                scriptedMoments: [
                    {
                        id: 'midterm-reckoning',
                        category: 'Campaign Milestone',
                        title: 'Midterm Reckoning',
                        timelineTitle: 'Midterm reckoning',
                        timelineLabel: '18 months to election',
                        timelineSummary: 'This is the first hard checkpoint where the government either starts to look real again or starts sounding like a polite failure.',
                        description: 'A year and a half out, local results and focus groups have fused into one brutal question: has the government actually made anything feel better yet?',
                        impact: 'This is the first fixed judgement beat of the demo campaign. It turns atmosphere into a verdict.',
                        trigger: {
                            scenarioId: { in: ['long-campaign'] },
                            monthsToElection: 18
                        },
                        choices: [
                            {
                                label: 'Answer with a public-service offensive',
                                cost: 10,
                                tone: 'success',
                                summary: 'You met the verdict with visible delivery language and one more tangible push on front-line competence.',
                                effects: {
                                    approvalRating: 2,
                                    voterApproval: { 'Labour Supporters': 2, 'Floating Voters': 3, 'LibDem Supporters': 1 },
                                    regionalSupport: { 'Northern England': 2, 'Midlands': 1 },
                                    performanceMetrics: { nhsWaitingTimes: -1.2 },
                                    governmentStability: 1,
                                    cabinetLoyalty: { health: 3, whip: 2 },
                                    factions: { service: 6, treasury: -3 }
                                }
                            },
                            {
                                label: 'Frame it as discipline, growth, and nerve',
                                cost: 6,
                                tone: 'info',
                                summary: 'The answer sounded steadier than warmer, but it reassured the parts of the coalition that fear drift more than coldness.',
                                effects: {
                                    voterApproval: { 'Floating Voters': 1, 'Conservative Supporters': 1, 'Labour Supporters': -1 },
                                    performanceMetrics: { gdpGrowth: 0.1 },
                                    governmentStability: 2,
                                    cabinetLoyalty: { treasury: 3, whip: 2 },
                                    factions: { treasury: 5, service: -2 }
                                }
                            },
                            {
                                label: 'Refuse the panic and stay the course',
                                cost: 0,
                                tone: 'error',
                                summary: 'The refusal to blink sounded more like distance than strength, and the judgement hardened around you.',
                                effects: {
                                    approvalRating: -3,
                                    voterApproval: { 'Labour Supporters': -2, 'Floating Voters': -3 },
                                    governmentStability: -2,
                                    cabinetLoyalty: { whip: -3, health: -2 },
                                    factions: { service: -6, treasury: -2 }
                                }
                            }
                        ]
                    },
                    {
                        id: 'year-out-verdict',
                        category: 'Campaign Milestone',
                        title: 'One Year Out',
                        timelineTitle: 'Year-out verdict',
                        timelineLabel: '12 months to election',
                        timelineSummary: 'The country now wants a reason to grant another year, not a recap of why governing is difficult.',
                        description: 'One year remains. Commentators, donors, MPs, and voters are all converging on the same question of whether this government has a credible second-act shape.',
                        impact: 'This is the hinge between governing and campaigning.',
                        trigger: {
                            scenarioId: { in: ['long-campaign'] },
                            monthsToElection: 12
                        },
                        choices: [
                            {
                                label: 'Reset the team and sharpen three promises',
                                cost: 9,
                                tone: 'success',
                                summary: 'The government finally looked like it had accepted that the campaign had started and decided to act like it.',
                                effects: {
                                    approvalRating: 2,
                                    voterApproval: { 'Floating Voters': 3, 'Labour Supporters': 1 },
                                    governmentStability: 3,
                                    cabinetLoyalty: { whip: 4, home: 2, treasury: 1 },
                                    factions: { service: 2, treasury: 2, security: 2 }
                                }
                            },
                            {
                                label: 'Keep the team and double down on delivery',
                                cost: 6,
                                tone: 'info',
                                summary: 'It was a bet that proof beats theatre, and for the moment the bet remained politically plausible.',
                                effects: {
                                    approvalRating: 1,
                                    voterApproval: { 'Floating Voters': 2, 'LibDem Supporters': 1 },
                                    performanceMetrics: { educationStandards: 1.2, climateProgress: 1.2 },
                                    governmentStability: 1,
                                    cabinetLoyalty: { health: 2, education: 2, energy: 2 },
                                    factions: { service: 4, green: 3, treasury: -2 }
                                }
                            },
                            {
                                label: 'Deny the need for a reset',
                                cost: 0,
                                tone: 'error',
                                summary: 'The stance was meant to project calm, but instead it convinced more people that the government had stopped hearing the room.',
                                effects: {
                                    approvalRating: -3,
                                    voterApproval: { 'Floating Voters': -3, 'Labour Supporters': -2, 'Conservative Supporters': 1 },
                                    governmentStability: -3,
                                    cabinetLoyalty: { whip: -4, treasury: -2 },
                                    factions: { service: -4, security: -2, treasury: -2 }
                                }
                            }
                        ]
                    },
                    {
                        id: 'second-term-frame',
                        category: 'Campaign Milestone',
                        title: 'The Second-Term Frame',
                        timelineTitle: 'Second-term frame',
                        timelineLabel: '6 months to election',
                        timelineSummary: 'This is where the campaign stops being about record alone and becomes about what another term would actually feel like.',
                        description: 'Six months out, the campaign team insists the government now needs a simple, emotionally legible answer to the question of why it deserves another term.',
                        impact: 'You are no longer managing drift. You are defining the offer.',
                        trigger: {
                            scenarioId: { in: ['long-campaign'] },
                            monthsToElection: 6
                        },
                        choices: [
                            {
                                label: 'Make the case for steady national renewal',
                                cost: 8,
                                tone: 'success',
                                summary: 'The argument landed because it sounded like a plan for ordinary life to feel sturdier rather than merely a promise of better process.',
                                effects: {
                                    approvalRating: 2,
                                    voterApproval: { 'Floating Voters': 3, 'LibDem Supporters': 2, 'Labour Supporters': 1 },
                                    governmentStability: 2,
                                    factions: { service: 2, treasury: 2, green: 2 }
                                }
                            },
                            {
                                label: 'Lean into order, control, and state authority',
                                cost: 6,
                                tone: 'warning',
                                summary: 'The line gave the campaign harder edges and made the government look more forceful, though it narrowed the coalition at the same time.',
                                effects: {
                                    voterApproval: { 'Floating Voters': 1, 'Conservative Supporters': 2, 'Reform Supporters': 2, 'Green Supporters': -2 },
                                    governmentStability: 1,
                                    cabinetLoyalty: { home: 3 },
                                    factions: { security: 6, green: -4, service: -1 }
                                }
                            },
                            {
                                label: 'Keep the offer broad and non-committal',
                                cost: 0,
                                tone: 'error',
                                summary: 'The vagueness was meant to keep everyone aboard, but it mostly confirmed that the campaign still feared saying one clear thing out loud.',
                                effects: {
                                    approvalRating: -3,
                                    voterApproval: { 'Floating Voters': -3, 'Labour Supporters': -1, 'Reform Supporters': 1 },
                                    governmentStability: -2,
                                    cabinetLoyalty: { whip: -3, treasury: -2 },
                                    factions: { service: -3, treasury: -2, security: -2, green: -2 }
                                }
                            }
                        ]
                    },
                    {
                        id: 'manifesto-costings-week',
                        category: 'Campaign Milestone',
                        title: 'Manifesto Costings Week',
                        timelineTitle: 'Manifesto costings week',
                        timelineLabel: '3 months to election',
                        timelineSummary: 'The campaign now has to prove its second-term offer sounds serious on money, not just emotionally persuasive.',
                        description: 'With three months left, broadcasters, donors, and opponents are converging on one brutal question: is the offer actually costed, or is it just mood music with a logo on it?',
                        impact: 'This is the fixed late-campaign test of whether your pitch survives contact with arithmetic.',
                        trigger: {
                            scenarioId: { in: ['long-campaign'] },
                            monthsToElection: 3
                        },
                        choices: [
                            {
                                label: 'Narrow the offer and cost everything in public',
                                cost: 7,
                                tone: 'success',
                                summary: 'The offer looked tighter and more disciplined, and critics found it harder to say the campaign was bluffing about the numbers.',
                                effects: {
                                    approvalRating: 2,
                                    voterApproval: { 'Floating Voters': 3, 'Conservative Supporters': 1, 'Labour Supporters': -1 },
                                    governmentStability: 2,
                                    cabinetLoyalty: { treasury: 4, whip: 2 },
                                    factions: { treasury: 6, service: -2, green: -1 }
                                }
                            },
                            {
                                label: 'Keep the offer broad but anchor it in service delivery',
                                cost: 5,
                                tone: 'info',
                                summary: 'You defended the platform by tying it to schools, waits, and visible state capacity, which kept the coalition together even if it left some fiscal doubt hanging.',
                                effects: {
                                    voterApproval: { 'Floating Voters': 2, 'Labour Supporters': 1, 'LibDem Supporters': 1 },
                                    performanceMetrics: { nhsWaitingTimes: -0.6, educationStandards: 0.8 },
                                    governmentStability: 1,
                                    factions: { service: 3, treasury: -2 }
                                }
                            },
                            {
                                label: 'Brush it off and fight on politics instead',
                                cost: 1,
                                tone: 'warning',
                                summary: 'The move kept the activists noisy and happy, but it also let opponents say the campaign still had not grown up enough to level with voters.',
                                effects: {
                                    approvalRating: -2,
                                    voterApproval: { 'Labour Supporters': 1, 'Floating Voters': -3, 'Conservative Supporters': 2 },
                                    governmentStability: -1,
                                    cabinetLoyalty: { treasury: -4, whip: -2 },
                                    factions: { treasury: -6, service: 1, green: 1 }
                                }
                            }
                        ]
                    },
                    {
                        id: 'election-eve-address',
                        category: 'Campaign Milestone',
                        title: 'Election Eve Address',
                        timelineTitle: 'Election eve address',
                        timelineLabel: 'Final month',
                        timelineSummary: 'The last message is not just about votes. It tells the player what kind of government they really spent the whole campaign trying to be.',
                        description: 'The final televised address is your last uncontested chance to tell the country what this government has learned, what it fears, and why it should be trusted again.',
                        impact: 'This is the closing authored beat before election day.',
                        trigger: {
                            scenarioId: { in: ['long-campaign'] },
                            monthsToElection: 1
                        },
                        choices: [
                            {
                                label: 'Speak directly to household pressure',
                                cost: 4,
                                tone: 'success',
                                summary: 'The address felt practical, grounded, and unusually human for a government that had too often sounded procedural.',
                                effects: {
                                    approvalRating: 2,
                                    voterApproval: { 'Floating Voters': 3, 'Labour Supporters': 2, 'LibDem Supporters': 1 },
                                    regionalSupport: { 'Midlands': 2, 'Northern England': 1 },
                                    governmentStability: 1,
                                    factions: { service: 2 }
                                }
                            },
                            {
                                label: 'Pitch stability, seriousness, and safe hands',
                                cost: 3,
                                tone: 'info',
                                summary: 'It did not set the blood racing, but it reminded the electorate that there is still such a thing as looking prime-ministerial.',
                                effects: {
                                    voterApproval: { 'Floating Voters': 1, 'Conservative Supporters': 1 },
                                    governmentStability: 2,
                                    factions: { treasury: 3, security: 2 }
                                }
                            },
                            {
                                label: 'Turn it into a warning about the alternative',
                                cost: 2,
                                tone: 'warning',
                                summary: 'The attack drew cheers from loyalists, but many undecided voters heard another confirmation that politics had become exhausted and joyless.',
                                effects: {
                                    approvalRating: -1,
                                    voterApproval: { 'Labour Supporters': 2, 'Floating Voters': -2, 'Green Supporters': -1 },
                                    governmentStability: 0,
                                    factions: { security: 1, service: 1, green: -1 }
                                }
                            }
                        ]
                    }
                ],
                events: [
                    {
                        title: 'A government entering its judgment phase',
                        description: 'Voters are no longer listening for intent. They are watching for signs that the machine can still land anything real.',
                        impact: 'This is the start of the featured campaign proper.'
                    },
                    {
                        title: 'Election clock becomes visible',
                        description: 'Every briefing, every reshuffle rumour, and every local result is now being read through the question of whether you can still hold power in 2029.',
                        impact: 'The horizon is close enough to change behaviour.'
                    }
                ],
                electionLedger: [
                    {
                        dateLabel: 'Aug 2027',
                        title: 'Featured campaign begins',
                        detail: 'The long campaign opens with thin patience, a narrow path, and a public that wants visible seriousness before it grants another chance.',
                        tone: 'warning'
                    }
                ],
                openingHighlights: [
                    'This is the featured demo: a 24-month authored campaign to the 2029 election.',
                    'Public services and living standards are the fastest ways to lose the room.',
                    'Treasury Hawks and the Authority Caucus are both restless enough to matter.'
                ],
                summary: 'Two years remain. The country no longer wants a promise of competence; it wants evidence.'
            },
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
            },
            {
                id: 'conference-reset',
                category: 'Party Conference',
                title: 'Conference Season Verdict',
                description: 'Ministers want the party conference to feel like a reset, but delegates and broadcasters are treating it like a confidence vote in slow motion.',
                impact: 'This is where narrative, delivery, and party management become impossible to separate.',
                probability: 0.2,
                weight: 3,
                trigger: {
                    turnNumber: { min: 3 },
                    scenarioId: { in: ['long-campaign'] },
                    currentMonth: { in: [8, 9] }
                },
                choices: [
                    {
                        label: 'Go big on delivery and mission language',
                        cost: 8,
                        tone: 'success',
                        summary: 'The speech did not solve the underlying problems, but it briefly made the government sound like it still had a plan.',
                        effects: {
                            approvalRating: 1,
                            voterApproval: { 'Labour Supporters': 2, 'Floating Voters': 2 },
                            governmentStability: 2,
                            cabinetLoyalty: { whip: 4, education: 2 }
                        }
                    },
                    {
                        label: 'Keep it sober and talk about the books',
                        cost: 4,
                        tone: 'info',
                        summary: 'The fiscal case landed with Westminster insiders, though many members left wanting a little more fire.',
                        effects: {
                            voterApproval: { 'Conservative Supporters': 1, 'Floating Voters': 1, 'Labour Supporters': -1 },
                            governmentStability: 1,
                            cabinetLoyalty: { treasury: 4, whip: -1 }
                        }
                    },
                    {
                        label: 'Minimise risk and coast through it',
                        cost: 0,
                        tone: 'error',
                        summary: 'A chance to reset the mood instead turned into another week of people wondering what the government is actually for.',
                        effects: {
                            approvalRating: -2,
                            voterApproval: { 'Labour Supporters': -2, 'Floating Voters': -2 },
                            governmentStability: -2,
                            cabinetLoyalty: { whip: -4, health: -2 }
                        }
                    }
                ]
            },
            {
                id: 'manifesto-proof-point',
                category: 'Election Run-In',
                title: 'Manifesto Proof Point',
                description: 'Advisers are split on whether the campaign needs one bold proof point or a tighter, lower-risk offer built around competence and delivery.',
                impact: 'This is the choice between ambition, caution, and whether the public still believes either of them.',
                probability: 0.18,
                weight: 4,
                trigger: {
                    turnNumber: { min: 10 },
                    scenarioId: { in: ['long-campaign'] },
                    monthsToElection: { max: 8 }
                },
                choices: [
                    {
                        label: 'Launch one visible cost-of-living guarantee',
                        cost: 12,
                        tone: 'success',
                        summary: 'It was expensive, but it gave the campaign something concrete to say out loud at every stop.',
                        effects: {
                            approvalRating: 2,
                            voterApproval: { 'Floating Voters': 3, 'Labour Supporters': 2, 'LibDem Supporters': 1 },
                            governmentStability: 1,
                            cabinetLoyalty: { treasury: -3, whip: 2 }
                        }
                    },
                    {
                        label: 'Pitch disciplined competence and delivery',
                        cost: 6,
                        tone: 'info',
                        summary: 'The offer looked tighter and more governable, though a few activists immediately muttered that it lacked imagination.',
                        effects: {
                            voterApproval: { 'Floating Voters': 2, 'Conservative Supporters': 1, 'Green Supporters': -1 },
                            governmentStability: 1,
                            cabinetLoyalty: { treasury: 2, energy: -1 }
                        }
                    },
                    {
                        label: 'Delay the call and keep testing lines',
                        cost: 0,
                        tone: 'error',
                        summary: 'The hesitation fed the suspicion that the government still wants another briefing round more than it wants to make an argument.',
                        effects: {
                            approvalRating: -3,
                            voterApproval: { 'Floating Voters': -3, 'Labour Supporters': -2, 'Reform Supporters': 1 },
                            governmentStability: -2,
                            cabinetLoyalty: { whip: -3, treasury: -2 }
                        }
                    }
                ]
            },
            {
                id: 'metro-mayor-pushback',
                category: 'Delivery',
                title: 'Metro Mayors Demand Proof',
                description: 'Labour mayors and council leaders are warning that Whitehall still announces missions faster than it fixes delivery on the ground.',
                impact: 'If your own local leaders start briefing against you, competence stops sounding national and starts sounding hollow.',
                probability: 0.18,
                weight: 3,
                trigger: {
                    turnNumber: { min: 4 },
                    scenarioId: { in: ['long-campaign'] },
                    phase: { in: ['opening', 'delivery'] },
                    serviceFaction: { max: 54 },
                    publicServicesPressure: { min: 54 }
                },
                choices: [
                    {
                        label: 'Back a local delivery fund and give them cover',
                        cost: 9,
                        tone: 'success',
                        summary: 'You bought some peace by giving local leaders something visible to defend on the airwaves.',
                        effects: {
                            approvalRating: 1,
                            voterApproval: { 'Labour Supporters': 2, 'Floating Voters': 2 },
                            regionalSupport: { 'Northern England': 2, 'Midlands': 1 },
                            governmentStability: 1,
                            cabinetLoyalty: { whip: 2, health: 2 },
                            factions: { service: 7, treasury: -3 }
                        }
                    },
                    {
                        label: 'Recentre control in No. 10 and run it harder',
                        cost: 5,
                        tone: 'warning',
                        summary: 'The operation looked tidier, but local frustration only went quiet rather than going away.',
                        effects: {
                            voterApproval: { 'Floating Voters': 1, 'Conservative Supporters': 1, 'Labour Supporters': -1 },
                            governmentStability: 1,
                            cabinetLoyalty: { whip: 3 },
                            factions: { service: -4, treasury: 2, security: 1 }
                        }
                    },
                    {
                        label: 'Tell them to stop freelancing and show discipline',
                        cost: 0,
                        tone: 'error',
                        summary: 'The rebuke leaked immediately and confirmed every suspicion that the government listens inward long before it listens outward.',
                        effects: {
                            approvalRating: -2,
                            voterApproval: { 'Labour Supporters': -2, 'Floating Voters': -1 },
                            regionalSupport: { 'Northern England': -2, 'Midlands': -1 },
                            governmentStability: -2,
                            cabinetLoyalty: { whip: -3, health: -2 },
                            factions: { service: -7 }
                        }
                    }
                ]
            },
            {
                id: 'spending-review-crunch',
                category: 'Treasury',
                title: 'Spending Review Crunch',
                description: 'The spending review is becoming a full-spectrum political fight between visible delivery, fiscal discipline, and a party that wants both at once.',
                impact: 'This is where internal arithmetic becomes public character.',
                probability: 0.17,
                weight: 4,
                trigger: {
                    turnNumber: { min: 6 },
                    scenarioId: { in: ['long-campaign'] },
                    phase: { in: ['delivery', 'holding'] },
                    treasuryFaction: { max: 50 },
                    implementationLoad: { min: 2 }
                },
                choices: [
                    {
                        label: 'Protect two missions and cut the rest loose',
                        cost: 5,
                        tone: 'info',
                        summary: 'The message sharpened, though parts of the coalition instantly recognised themselves as the part being cut loose.',
                        effects: {
                            politicalCapital: 4,
                            voterApproval: { 'Floating Voters': 1, 'Conservative Supporters': 1, 'Green Supporters': -1 },
                            governmentStability: 1,
                            cabinetLoyalty: { treasury: 4, energy: -2 },
                            factions: { treasury: 8, service: -3, green: -2 }
                        }
                    },
                    {
                        label: 'Borrow for one more visible push',
                        cost: 11,
                        tone: 'success',
                        summary: 'You made one more large bet on delivery and bought the government a little hope along with a lot of nerves.',
                        effects: {
                            approvalRating: 1,
                            voterApproval: { 'Labour Supporters': 2, 'Floating Voters': 2 },
                            performanceMetrics: { gdpGrowth: 0.2 },
                            governmentStability: 1,
                            cabinetLoyalty: { treasury: -5, whip: 2 },
                            factions: { service: 5, green: 2, treasury: -8 }
                        }
                    },
                    {
                        label: 'Delay the review and hope growth saves it',
                        cost: 0,
                        tone: 'error',
                        summary: 'The drift looked like fear, and fear in a spending review quickly turns into a story about weakness.',
                        effects: {
                            approvalRating: -2,
                            governmentStability: -3,
                            cabinetLoyalty: { treasury: -6, whip: -2 },
                            factions: { treasury: -6, service: -2 }
                        }
                    }
                ]
            },
            {
                id: 'channel-crossing-surge',
                category: 'Border Pressure',
                title: 'A Week of Small Boats Coverage',
                description: 'A fresh run of crossings has turned into a rolling television event, and every interview is now a test of whether ministers look in command.',
                impact: 'The public will notice tone as much as policy substance here.',
                probability: 0.18,
                weight: 4,
                trigger: {
                    turnNumber: { min: 7 },
                    scenarioId: { in: ['long-campaign'] },
                    phase: { in: ['delivery', 'holding', 'run-in'] },
                    securityFaction: { max: 52 },
                    immigrationPressure: { min: 52 }
                },
                choices: [
                    {
                        label: 'Pair enforcement with a practical returns package',
                        cost: 10,
                        tone: 'success',
                        summary: 'It looked more serious than performative, which mattered because voters expected competence rather than theatre.',
                        effects: {
                            approvalRating: 1,
                            voterApproval: { 'Floating Voters': 2, 'Conservative Supporters': 1, 'Labour Supporters': 1 },
                            governmentStability: 2,
                            cabinetLoyalty: { home: 4, whip: 2 },
                            factions: { security: 4, service: 2, treasury: -2 }
                        }
                    },
                    {
                        label: 'Flood the week with visible enforcement theatre',
                        cost: 7,
                        tone: 'warning',
                        summary: 'The clips looked tough, but parts of the coalition immediately worried that the government was acting for the frame more than the outcome.',
                        effects: {
                            voterApproval: { 'Reform Supporters': 2, 'Conservative Supporters': 2, 'Green Supporters': -2 },
                            governmentStability: 1,
                            cabinetLoyalty: { home: 3 },
                            factions: { security: 6, green: -3, service: -1 }
                        }
                    },
                    {
                        label: 'Ride it out and argue the trendline',
                        cost: 0,
                        tone: 'error',
                        summary: 'The numbers may have helped on paper, but on television it sounded like ministers had reached for a spreadsheet instead of a grip.',
                        effects: {
                            approvalRating: -3,
                            voterApproval: { 'Floating Voters': -2, 'Reform Supporters': 3, 'Labour Supporters': -1 },
                            governmentStability: -3,
                            cabinetLoyalty: { home: -5, whip: -2 },
                            factions: { security: -7 }
                        }
                    }
                ]
            },
            {
                id: 'grid-backlog-row',
                category: 'Climate and Growth',
                title: 'Grid Backlog Row',
                description: 'Business leaders and climate groups are both furious that promised clean-energy projects are stuck in planning and grid delays.',
                impact: 'This is a test of whether your future-facing story still sounds real or merely decorative.',
                probability: 0.16,
                weight: 3,
                trigger: {
                    turnNumber: { min: 5 },
                    scenarioId: { in: ['long-campaign'] },
                    greenFaction: { max: 54 },
                    climatePressure: { min: 50 }
                },
                choices: [
                    {
                        label: 'Accelerate grid and retrofit approvals',
                        cost: 10,
                        tone: 'success',
                        summary: 'The move finally made the modernising case feel practical rather than rhetorical.',
                        effects: {
                            approvalRating: 1,
                            voterApproval: { 'Green Supporters': 4, 'LibDem Supporters': 2, 'Floating Voters': 1 },
                            performanceMetrics: { climateProgress: 3.2, gdpGrowth: 0.1 },
                            governmentStability: 1,
                            cabinetLoyalty: { energy: 5, treasury: -2 },
                            factions: { green: 8, treasury: -4, service: 1 }
                        }
                    },
                    {
                        label: 'Reframe it as jobs-first industrial policy',
                        cost: 6,
                        tone: 'info',
                        summary: 'The message broadened your coalition, even if some campaigners felt the original urgency being sanded off.',
                        effects: {
                            voterApproval: { 'Floating Voters': 2, 'Conservative Supporters': 1, 'Green Supporters': 1 },
                            performanceMetrics: { climateProgress: 1.4, gdpGrowth: 0.2 },
                            cabinetLoyalty: { energy: 2, treasury: 1 },
                            factions: { green: 3, treasury: 2 }
                        }
                    },
                    {
                        label: 'Slow the timetable and avoid another fight',
                        cost: 0,
                        tone: 'error',
                        summary: 'The caution looked small, but politically it landed as another retreat from something the government once sounded proud of.',
                        effects: {
                            approvalRating: -1,
                            voterApproval: { 'Green Supporters': -4, 'LibDem Supporters': -2, 'Floating Voters': -1 },
                            performanceMetrics: { climateProgress: -2.2 },
                            governmentStability: -1,
                            cabinetLoyalty: { energy: -5 },
                            factions: { green: -8, treasury: 2 }
                        }
                    }
                ]
            },
            {
                id: 'leaders-debate-pivot',
                category: 'Campaign',
                title: 'Leaders\' Debate Pivot',
                description: 'The campaign team has one final argument to choose before the big television debate: relief, reassurance, or attack.',
                impact: 'This is less about policy precision than about what kind of second term you are really asking voters to imagine.',
                probability: 0.2,
                weight: 4,
                trigger: {
                    turnNumber: { min: 14 },
                    scenarioId: { in: ['long-campaign'] },
                    phase: { in: ['run-in'] },
                    monthsToElection: { max: 4 },
                    floatingVoters: { max: 38 }
                },
                choices: [
                    {
                        label: 'Make it a cost-of-living debate',
                        cost: 8,
                        tone: 'success',
                        summary: 'The debate landed because it sounded like a case for ordinary life getting easier rather than a seminar on good government.',
                        effects: {
                            approvalRating: 2,
                            voterApproval: { 'Floating Voters': 3, 'Labour Supporters': 2, 'LibDem Supporters': 1 },
                            regionalSupport: { 'Midlands': 2, 'Northern England': 1 },
                            governmentStability: 1,
                            factions: { service: 2, treasury: -2 }
                        }
                    },
                    {
                        label: 'Lean into statecraft and prime-ministerial calm',
                        cost: 5,
                        tone: 'info',
                        summary: 'The performance looked steady and grown-up, even if a few allies worried it lacked emotional punch.',
                        effects: {
                            voterApproval: { 'Floating Voters': 1, 'Conservative Supporters': 1 },
                            governmentStability: 2,
                            cabinetLoyalty: { treasury: 2, whip: 3 },
                            factions: { treasury: 3, security: 1 }
                        }
                    },
                    {
                        label: 'Go hard negative and make it a fear choice',
                        cost: 3,
                        tone: 'warning',
                        summary: 'It rallied some of your own people, but undecided viewers mainly saw another reminder of how exhausted politics already feels.',
                        effects: {
                            approvalRating: -1,
                            voterApproval: { 'Labour Supporters': 2, 'Floating Voters': -2, 'Green Supporters': -1 },
                            governmentStability: 0,
                            factions: { security: 2, green: -1, service: 1 }
                        }
                    }
                ]
            }
        ];
    }

    createInitialState(selection = {}) {
        const scenarioId = selection.scenarioId || this.defaultScenarioId;
        const difficulty = selection.difficulty || 'normal';
        const scenario = this.scenarios[scenarioId] || this.scenarios[this.defaultScenarioId] || this.scenarios['labour-2025'];
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
            version: 5,
            scenarioId,
            difficulty,
            scenarioName: scenario.name,
            titleDescription: scenario.titleDescription || scenario.description,
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
            lastTurnHighlights: [...(scenario.openingHighlights || this.getDefaultOpeningHighlights(scenario))],
            honeymoonMonths: scenario.honeymoonMonths,
            policies: { ...scenario.policies },
            voterApproval: { ...scenario.voterApproval },
            regionalSupport: { ...scenario.regionalSupport },
            performanceMetrics: { ...scenario.performanceMetrics },
            cabinet,
            factionMomentum: this.createFactionMomentumState(),
            factions: this.createFactionState(scenario),
            tutorial: {
                adjustedPolicy: false,
                viewedRegion: false,
                openedBriefing: false,
                resolvedEvent: false
            },
            agendaItems: [],
            campaignStory: null,
            campaignCompass: [],
            campaignTimeline: [],
            campaignPriorities: [],
            pressureFronts: [],
            battlegrounds: [],
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
            scriptedMomentsSeen: [],
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

    applyReviewState() {
        if (!this.reviewMode) return;
        if (this.reviewState === 'event') {
            this.applyReviewEventState();
            return;
        }
        if (this.reviewState === 'run-in') {
            this.applyReviewRunInState();
            return;
        }
        if (this.reviewState === 'result') {
            this.applyReviewResultState();
        }
    }

    applyReviewEventState() {
        const eventTemplate = this.eventTemplates.find((event) => event.id === 'spending-review-crunch')
            || this.eventTemplates[0];

        this.gameState.currentDate = new Date(2028, 1, 1);
        this.gameState.turnNumber = 9;
        this.gameState.politicalCapital = 28;
        this.gameState.approvalRating = 36;
        this.gameState.governmentStability = 45;
        this.gameState.policies = {
            ...this.gameState.policies,
            nhsFunding: 58,
            socialCare: 43,
            schoolFunding: 60,
            higherEd: 42,
            incomeTax: 23,
            corporationTax: 27,
            policeFunding: 60,
            immigration: 51
        };
        this.gameState.voterApproval = {
            ...this.gameState.voterApproval,
            'Labour Supporters': 58,
            'Conservative Supporters': 22,
            'LibDem Supporters': 38,
            'Reform Supporters': 18,
            'Green Supporters': 43,
            'Floating Voters': 28
        };
        this.gameState.regionalSupport = {
            ...this.gameState.regionalSupport,
            'Scotland': 31,
            'Northern England': 44,
            'Midlands': 39,
            'Wales': 40,
            'London': 54,
            'South': 31
        };
        this.gameState.performanceMetrics = {
            ...this.gameState.performanceMetrics,
            nhsWaitingTimes: 22,
            educationStandards: 53,
            crimeRate: 50,
            gdpGrowth: 1.0,
            unemployment: 5.3,
            climateProgress: 41
        };
        this.gameState.cabinet = this.normaliseCabinet({
            health: { loyalty: 56 },
            treasury: { loyalty: 41 },
            home: { loyalty: 49 },
            education: { loyalty: 58 },
            energy: { loyalty: 55 },
            whip: { loyalty: 47 }
        }, this.gameState.cabinet);
        this.gameState.factionMomentum = this.createFactionMomentumState({
            service: 2,
            treasury: -11,
            security: -2,
            green: 1
        });
        this.gameState.scriptedMomentsSeen = ['midterm-reckoning'];
        this.gameState.implementationQueue = [
            {
                policy: 'Neighbourhood Health Recovery',
                progress: 82,
                monthsRemaining: 1,
                effect: {
                    voterApproval: { 'Labour Supporters': 3, 'Floating Voters': 2 },
                    metrics: { nhsWaitingTimes: -1.4 },
                    governmentStability: 2
                }
            },
            {
                policy: 'Skills and Schools Push',
                progress: 46,
                monthsRemaining: 2,
                effect: {
                    voterApproval: { 'LibDem Supporters': 2, 'Green Supporters': 1, 'Floating Voters': 1 },
                    metrics: { educationStandards: 1.3 },
                    governmentStability: 1
                }
            },
            {
                policy: 'Border Casework Surge',
                progress: 24,
                monthsRemaining: 3,
                effect: {
                    voterApproval: { 'Floating Voters': 1, 'Reform Supporters': 1, 'Green Supporters': -1 },
                    governmentStability: 1
                }
            }
        ];
        this.gameState.events = [
            {
                title: 'Midterm Reckoning',
                description: 'Local results and focus groups have sharpened into a blunt verdict on whether the government feels real again.',
                impact: 'You answered with a public-service push and bought some time, but the fiscal fight never really went away.'
            },
            ...this.gameState.events.slice(0, 3)
        ].slice(0, 5);
        this.gameState.pendingEvent = this.cloneData(eventTemplate);
        this.gameState.lastTurnSummary = 'Review state: the government is trapped in a live spending-review fight, with delivery, discipline, and party management colliding at once.';
        this.gameState.lastTurnHighlights = [
            'This preset is for reviewing the live event decision surface.',
            'Treasury Hawks are fraying and the implementation queue is still crowded.',
            'Midlands support is soft enough that a weak answer now feeds straight into the electoral map.',
            'The spending review choice is live immediately so reviewers can inspect the crisis UX without a manual playthrough.'
        ];
        this.gameState.tutorial = {
            ...this.gameState.tutorial,
            adjustedPolicy: true,
            viewedRegion: true,
            openedBriefing: true,
            resolvedEvent: false
        };
    }

    applyReviewResultState() {
        this.gameState.currentDate = new Date(...this.scenarios[this.gameState.scenarioId].electionDate);
        this.gameState.turnNumber = 24;
        this.gameState.politicalCapital = 11;
        this.gameState.approvalRating = 44;
        this.gameState.governmentStability = 54;
        this.gameState.policies = {
            ...this.gameState.policies,
            nhsFunding: 60,
            socialCare: 45,
            schoolFunding: 61,
            higherEd: 44,
            incomeTax: 22,
            corporationTax: 26,
            policeFunding: 59,
            immigration: 52
        };
        this.gameState.voterApproval = {
            ...this.gameState.voterApproval,
            'Labour Supporters': 64,
            'Conservative Supporters': 24,
            'LibDem Supporters': 42,
            'Reform Supporters': 17,
            'Green Supporters': 45,
            'Floating Voters': 35
        };
        this.gameState.regionalSupport = {
            ...this.gameState.regionalSupport,
            'Scotland': 35,
            'Northern England': 48,
            'Midlands': 44,
            'Wales': 44,
            'London': 56,
            'South': 36
        };
        this.gameState.performanceMetrics = {
            ...this.gameState.performanceMetrics,
            nhsWaitingTimes: 18,
            educationStandards: 58,
            crimeRate: 48,
            gdpGrowth: 1.7,
            unemployment: 4.8,
            climateProgress: 45
        };
        this.gameState.factionMomentum = this.createFactionMomentumState({
            service: 4,
            treasury: -3,
            security: 1,
            green: 2
        });
        this.gameState.pendingEvent = null;
        this.gameState.scriptedMomentsSeen = this.getScenarioScriptedMoments().map((moment) => moment.id);
        this.gameState.events = [
            {
                title: 'Manifesto Costings Week',
                description: 'The platform survived a bruising scrutiny cycle, but the closing offer ended up narrower and more fiscally exposed.',
                impact: 'The run-in became more disciplined, but less forgiving.'
            },
            {
                title: 'Leaders\' Debate Pivot',
                description: 'You took the cost-of-living route and made the second-term pitch sound grounded in ordinary life.',
                impact: 'The debate steadied the run-in, but did not remove the underlying arithmetic.'
            },
            {
                title: 'Grid Backlog Row',
                description: 'Infrastructure delays briefly reopened the competence attack line.',
                impact: 'The fallout stayed containable because the government still looked broadly functional.'
            },
            ...this.gameState.events.slice(0, 2)
        ].slice(0, 5);
        this.gameState.electionLedger = [
            {
                dateLabel: 'Jul 2029',
                title: 'Election night',
                detail: 'Review preset for the result screen and end-of-run explanation.',
                tone: 'success'
            },
            {
                dateLabel: 'Apr 2029',
                title: 'Manifesto costings week',
                detail: 'The offer held together under scrutiny, but the campaign lost some room for rhetorical comfort in the process.',
                tone: 'info'
            },
            ...this.gameState.electionLedger.slice(0, 6)
        ];
        this.refreshCampaignState();
        this.gameState.legacyScore = this.calculateLegacyScore(301);
        this.gameState.electionResolved = true;
        this.gameState.electionResult = {
            projectedSeats: 301,
            outcome: 'Minority Government',
            summary: 'You remain in office, but every vote in Parliament will be a fight and the second term begins on thin political ice.',
            legacyScore: this.gameState.legacyScore
        };
        this.gameState.lastTurnSummary = 'Review state: election night returns a minority-government result, with enough authority to survive but not enough to relax.';
        this.gameState.lastTurnHighlights = [
            'This preset is for reviewing the election result and debrief surfaces.',
            'The map held just well enough in London and Northern England to keep the government alive.',
            'The Midlands stayed too soft for a clean majority, which is why the result remains politically narrow.',
            `Legacy score settles at ${this.gameState.legacyScore}.`
        ];
        this.gameState.tutorial = {
            ...this.gameState.tutorial,
            adjustedPolicy: true,
            viewedRegion: true,
            openedBriefing: true,
            resolvedEvent: true
        };
    }

    applyReviewRunInState() {
        const finalMilestone = this.getScenarioScriptedMoments().find((moment) => moment.id === 'election-eve-address')
            || this.eventTemplates.find((event) => event.id === 'leaders-debate-pivot')
            || this.eventTemplates[0];

        this.gameState.currentDate = new Date(2029, 6, 1);
        this.gameState.turnNumber = 23;
        this.gameState.politicalCapital = 8;
        this.gameState.approvalRating = 41;
        this.gameState.governmentStability = 47;
        this.gameState.policies = {
            ...this.gameState.policies,
            nhsFunding: 59,
            socialCare: 44,
            schoolFunding: 60,
            higherEd: 43,
            incomeTax: 22,
            corporationTax: 26,
            policeFunding: 58,
            immigration: 54
        };
        this.gameState.voterApproval = {
            ...this.gameState.voterApproval,
            'Labour Supporters': 61,
            'Conservative Supporters': 24,
            'LibDem Supporters': 39,
            'Reform Supporters': 19,
            'Green Supporters': 41,
            'Floating Voters': 31
        };
        this.gameState.regionalSupport = {
            ...this.gameState.regionalSupport,
            'Scotland': 33,
            'Northern England': 46,
            'Midlands': 41,
            'Wales': 42,
            'London': 54,
            'South': 35
        };
        this.gameState.performanceMetrics = {
            ...this.gameState.performanceMetrics,
            nhsWaitingTimes: 19,
            educationStandards: 56,
            crimeRate: 49,
            gdpGrowth: 1.2,
            unemployment: 5.1,
            climateProgress: 44
        };
        this.gameState.cabinet = this.normaliseCabinet({
            health: { loyalty: 61 },
            treasury: { loyalty: 48 },
            home: { loyalty: 54 },
            education: { loyalty: 58 },
            energy: { loyalty: 51 },
            whip: { loyalty: 46 }
        }, this.gameState.cabinet);
        this.gameState.factionMomentum = this.createFactionMomentumState({
            service: 1,
            treasury: -6,
            security: 2,
            green: -3
        });
        this.gameState.scriptedMomentsSeen = [
            'midterm-reckoning',
            'year-out-verdict',
            'second-term-frame',
            'manifesto-costings-week'
        ];
        this.gameState.implementationQueue = [
            {
                policy: 'Neighbourhood Health Recovery',
                progress: 93,
                monthsRemaining: 1,
                effect: {
                    voterApproval: { 'Labour Supporters': 2, 'Floating Voters': 2 },
                    metrics: { nhsWaitingTimes: -1.1 },
                    governmentStability: 1
                }
            },
            {
                policy: 'Grid Connections Fast Track',
                progress: 64,
                monthsRemaining: 2,
                effect: {
                    voterApproval: { 'Green Supporters': 2, 'LibDem Supporters': 1 },
                    metrics: { climateProgress: 1.4 },
                    governmentStability: 1
                }
            },
            {
                policy: 'Border Casework Surge',
                progress: 58,
                monthsRemaining: 2,
                effect: {
                    voterApproval: { 'Floating Voters': 1, 'Reform Supporters': 1 },
                    governmentStability: 1
                }
            },
            {
                policy: 'Mortgage Relief Comms Blitz',
                progress: 35,
                monthsRemaining: 1,
                effect: {
                    voterApproval: { 'Floating Voters': 2, 'Labour Supporters': 1 },
                    governmentStability: 1
                }
            }
        ];
        this.gameState.events = [
            {
                title: 'Manifesto Costings Week',
                description: 'The platform survived its numbers test, but only after the campaign had to prove it could sound serious as well as hopeful.',
                impact: 'The closing offer is now narrower, harder, and more exposed to scrutiny.'
            },
            {
                title: 'Leaders\' Debate Pivot',
                description: 'The campaign team sharpened the final argument around household pressure, but the room still thinks the government could slip on competence in the final fortnight.',
                impact: 'The debate steadied the tone without solving the closing arithmetic.'
            },
            {
                title: 'Grid Backlog Row',
                description: 'Clean-growth promises are still being tested by whether projects actually move on time.',
                impact: 'You cannot afford a late-stage story that future-facing delivery was mostly rhetoric.'
            },
            {
                title: 'Border Pictures Dominate a Weekend',
                description: 'One ugly run of front pages reopened the argument about whether the state still looks in control.',
                impact: 'The final month is now carrying pressure on multiple fronts at once.'
            },
            ...this.gameState.events.slice(0, 2)
        ].slice(0, 5);
        this.gameState.electionLedger = [
            {
                dateLabel: 'Jul 2029',
                title: 'Final month begins',
                detail: 'The campaign has entered its last live checkpoint: delivery, party discipline, and the map are all tight at once.',
                tone: 'warning'
            },
            {
                dateLabel: 'May 2029',
                title: 'Manifesto costings week',
                detail: 'The offer survived a bruising numbers test, but it narrowed the room for error and made the closing message more exposed.',
                tone: 'info'
            },
            {
                dateLabel: 'Jun 2029',
                title: 'Grid backlog row',
                detail: 'Infrastructure delays reopened the competence attack line and narrowed the room for a calm final run-in.',
                tone: 'warning'
            },
            {
                dateLabel: 'Jun 2029',
                title: 'Leaders\' debate prep',
                detail: 'The closing message is no longer abstract. It will define what another term is meant to feel like.',
                tone: 'info'
            },
            ...this.gameState.electionLedger.slice(0, 4)
        ].slice(0, 8);
        this.gameState.pendingEvent = this.cloneData(finalMilestone);
        this.gameState.lastTurnSummary = 'Review state: the campaign is in its final live month, with a closing address still to land and several pressure fronts tightening at once.';
        this.gameState.lastTurnHighlights = [
            'This preset is for reviewing the strongest later-game checkpoint before election night.',
            'The final authored milestone is live immediately so reviewers can inspect a late-campaign choice without a manual playthrough.',
            'Midlands support is still soft enough that a weak final message becomes a map problem straight away.',
            'Implementation lanes are crowded, which means delivery pressure and narrative pressure are colliding in the same window.'
        ];
        this.gameState.tutorial = {
            ...this.gameState.tutorial,
            adjustedPolicy: true,
            viewedRegion: true,
            openedBriefing: true,
            resolvedEvent: false
        };
    }

    init() {
        this.applySettings();
        this.bindEvents();
        this.ensurePolicyImpactSlots();
        this.applyReviewState();
        this.syncSliders();
        this.refreshCampaignState();
        this.recordPollSnapshot();
        this.updatePolicyCosts();
        this.updateDisplay();
        this.syncOptionsControls();

        window.addEventListener('pointerdown', () => this.unlockAudio(), { once: true });

        if (!this.debugAutoStart) {
            this.openTitleScreen();
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
        document.getElementById('continueGameBtn').addEventListener('click', () => this.continueGame());
        document.getElementById('newGovernmentBtn').addEventListener('click', () => this.startScenario(this.defaultScenarioId, this.gameState.difficulty || 'normal'));
        document.getElementById('titleScenariosBtn').addEventListener('click', () => this.openScenarioModal());
        document.getElementById('titleHowToPlayBtn').addEventListener('click', () => this.showHelpModal());
        document.getElementById('optionsBtn').addEventListener('click', () => this.openOptionsModal());
        document.getElementById('briefingOptionsBtn').addEventListener('click', () => this.openOptionsModal());
        document.getElementById('closeOptionsBtn').addEventListener('click', () => this.closeOptionsModal());
        document.getElementById('dismissTutorialBtn').addEventListener('click', () => this.dismissTutorial());
        document.getElementById('musicToggle').addEventListener('change', (event) => this.updateSetting('musicEnabled', event.target.checked));
        document.getElementById('sfxToggle').addEventListener('change', (event) => this.updateSetting('sfxEnabled', event.target.checked));
        document.getElementById('reducedMotionToggle').addEventListener('change', (event) => this.updateSetting('reducedMotion', event.target.checked));
        document.getElementById('masterVolumeSlider').addEventListener('input', (event) => this.updateSetting('masterVolume', Number(event.target.value) / 100));

        window.addEventListener('keydown', (event) => {
            if (event.key === '?') {
                event.preventDefault();
                this.showHelpModal();
            }
            if (event.key === 'Escape') {
                this.hideHelpModal();
                this.closeScenarioModal();
                this.closeOptionsModal();
            }
        });

        document.querySelectorAll('.policy-slider').forEach((slider) => {
            slider.addEventListener('input', (event) => {
                this.gameState.tutorial.adjustedPolicy = true;
                this.updatePolicyValue(event.target.id, event.target.value);
                this.updatePolicyCosts();
                this.updateTutorialDisplay();
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

        document.addEventListener('click', (event) => {
            if (event.target.closest('button')) {
                this.playUiCue('press');
            }
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
            const impactNode = slider.parentNode.querySelector('.policy-impact');
            if (impactNode) {
                if (currentValue === nextValue) {
                    impactNode.innerHTML = '<strong>Likely impact:</strong> Hold current line and bank political capital.';
                } else {
                    const preview = this.describeEffectSummary(this.calculatePolicyEffect(slider.id, nextValue), { compact: true });
                    impactNode.innerHTML = `<strong>Likely impact:</strong> ${preview.join(' · ')}`;
                }
            }
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

        const event = !this.gameState.electionResolved
            ? this.generateScriptedEvent() || this.generateRandomEvent()
            : null;
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
        this.gameState.lastTurnHighlights = this.buildTurnHighlights({
            approvalDelta: this.gameState.approvalRating - previousApproval,
            changes,
            completed,
            event
        });
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
        const issuePressures = this.gameState.issuePressures || this.buildIssuePressures();
        const liveFactions = this.gameState.factions || this.buildFactionState();
        const weakestFaction = this.getWeakestFaction();
        const strongestFaction = this.getStrongestFaction();
        return {
            scenarioId: this.gameState.scenarioId,
            turnNumber: this.gameState.turnNumber,
            currentMonth: this.gameState.currentDate.getMonth(),
            phase: this.getCampaignPhaseKey(),
            approvalRating: this.gameState.approvalRating,
            governmentStability: this.gameState.governmentStability,
            cabinetAverage: this.getAverageCabinetLoyalty(),
            monthsToElection: this.calculateMonthsToElection(),
            projectedSeats: this.calculateProjectedSeats(),
            implementationLoad: this.gameState.implementationQueue.length,
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
            immigration: this.gameState.policies.immigration,
            publicServicesPressure: issuePressures.publicServices,
            economyPressure: issuePressures.economy,
            livingStandardsPressure: issuePressures.livingStandards,
            immigrationPressure: issuePressures.immigration,
            climatePressure: issuePressures.climate,
            securityPressure: issuePressures.security,
            serviceFaction: liveFactions.service,
            treasuryFaction: liveFactions.treasury,
            securityFaction: liveFactions.security,
            greenFaction: liveFactions.green,
            weakestFactionSupport: weakestFaction.support,
            strongestFactionSupport: strongestFaction.support
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
        const weakestFaction = this.getWeakestFaction();
        let pressure = 0.24;
        pressure += Math.max(0, 44 - this.gameState.approvalRating) * 0.012;
        pressure += Math.max(0, 58 - this.gameState.governmentStability) * 0.008;
        pressure += Math.max(0, 65 - this.getAverageCabinetLoyalty()) * 0.006;
        pressure += Math.max(0, 48 - weakestFaction.support) * 0.006;
        pressure += Math.max(0, metrics.nhsWaitingTimes - 18) * 0.014;
        pressure += Math.max(0, 1.8 - metrics.gdpGrowth) * 0.04;
        pressure += Math.max(0, metrics.unemployment - 4.8) * 0.05;
        pressure += Math.max(0, 38 - metrics.climateProgress) * 0.008;
        pressure += this.gameState.confidenceWarnings * 0.05;
        return this.clamp(pressure, 0.2, 0.72);
    }

    generateScriptedEvent() {
        const signals = this.getEventSignals();
        const seen = new Set(this.gameState.scriptedMomentsSeen || []);
        const nextMoment = this.getScenarioScriptedMoments().find((moment) => (
            !seen.has(moment.id)
            && Object.entries(moment.trigger || {}).every(([key, rule]) => this.matchesEventRule(signals[key], rule))
        ));

        if (!nextMoment) return null;

        const event = { ...this.cloneData(nextMoment), scripted: true };
        this.gameState.pendingEvent = event;
        this.gameState.scriptedMomentsSeen = [...seen, event.id];
        return event;
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
        this.gameState.lastTurnHighlights = this.buildTurnHighlights({ event, choice });
        this.gameState.tutorial.resolvedEvent = true;
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
        this.gameState.factionMomentum = this.createFactionMomentumState(this.gameState.factionMomentum);
        Object.entries(effects.factions || {}).forEach(([faction, delta]) => {
            if (typeof this.gameState.factionMomentum[faction] !== 'number') return;
            this.gameState.factionMomentum[faction] = this.clamp(
                this.gameState.factionMomentum[faction] + this.scaleByDifficulty(delta, difficulty.eventImpactMultiplier),
                -18,
                18
            );
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
        const factionAverage = this.getAverageFactionSupport();
        const weakestFaction = this.getWeakestFaction();
        let target = 50
            + (this.gameState.approvalRating - 45) * 0.8
            + (this.gameState.politicalCapital - 50) * 0.2
            + (cabinetAverage - 60) * 0.18
            + (factionAverage - 52) * 0.2
            - this.gameState.implementationQueue.length * 2;
        if (this.gameState.emergencyPowers) target -= 8;
        if (weakestFaction.support < 40) target -= (40 - weakestFaction.support) * 0.28;
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
        const weakestFaction = this.getWeakestFaction();
        const weakestRegion = this.getWeakestRegion();
        const floatingVoters = this.gameState.voterApproval['Floating Voters'];
        const monthsToElection = this.calculateMonthsToElection();
        const runInMultiplier = monthsToElection <= 4 ? 1.25 : monthsToElection <= 8 ? 1.1 : 1;
        const score = this.gameState.approvalRating
            + this.gameState.governmentStability * 0.35
            + this.getAverageCabinetLoyalty() * 0.08
            + this.getAverageFactionSupport() * 0.06
            + (floatingVoters - 32) * 0.48 * runInMultiplier
            + (weakestRegion.support - 42) * 0.24 * runInMultiplier
            - Math.max(0, 46 - weakestFaction.support) * 0.3
            - Math.max(0, 34 - floatingVoters) * 0.45 * runInMultiplier
            - Math.max(0, 43 - weakestRegion.support) * 0.42 * runInMultiplier
            - Math.max(0, averagePressure - 48) * 0.42;
        return this.clamp(
            Math.round(138 + score * 2.05 + this.getDifficultyConfig().seatBonus),
            70,
            430
        );
    }

    getLegacyBreakdown(projectedSeats = this.calculateProjectedSeats()) {
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
        const total = Math.round(
            this.gameState.approvalRating * 0.23
            + this.gameState.governmentStability * 0.19
            + authorityScore * 0.12
            + servicesScore * 0.16
            + economyScore * 0.16
            + deliveryScore * 0.06
            + publicMoodScore * 0.08
            + seatScore * 0.08
        );
        return {
            total,
            publicMoodScore: Math.round(publicMoodScore),
            servicesScore: Math.round(servicesScore),
            economyScore: Math.round(economyScore),
            authorityScore: Math.round(authorityScore),
            deliveryScore: Math.round(deliveryScore),
            seatScore: Math.round(seatScore)
        };
    }

    calculateLegacyScore(projectedSeats = this.calculateProjectedSeats()) {
        return this.getLegacyBreakdown(projectedSeats).total;
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
        const phaseKey = this.getCampaignPhaseKey();
        const phaseCompression = {
            opening: 0,
            delivery: 3,
            holding: 6,
            'run-in': 10
        }[phaseKey] || 0;
        const factions = this.gameState.factions || this.buildFactionState();
        const weakestRegion = this.getWeakestRegion();
        const implementationLoad = this.gameState.implementationQueue.length;
        const queuePressure = Math.max(0, implementationLoad - 2) * 2.6;
        const regionalFragility = Math.max(0, 44 - weakestRegion.support) * 0.45;
        const pendingEventPressure = this.gameState.pendingEvent ? 3.5 : 0;
        const servicePenalty = Math.max(0, 55 - factions.service) * 0.24;
        const treasuryPenalty = Math.max(0, 54 - factions.treasury) * 0.26;
        const securityPenalty = Math.max(0, 54 - factions.security) * 0.24;
        const greenPenalty = Math.max(0, 54 - factions.green) * 0.22;

        return {
            publicServices: this.clamp(
                26
                + this.gameState.performanceMetrics.nhsWaitingTimes * 2.2
                + (62 - this.gameState.performanceMetrics.educationStandards) * 0.55
                + (55 - this.gameState.policies.nhsFunding) * 0.22
                + (45 - this.gameState.policies.socialCare) * 0.18,
                + servicePenalty
                + queuePressure * 0.75
                + phaseCompression * 0.5,
                10,
                95
            ),
            economy: this.clamp(
                34
                - this.gameState.performanceMetrics.gdpGrowth * 9
                + this.gameState.performanceMetrics.unemployment * 6.4
                + Math.max(0, this.gameState.policies.corporationTax - 27) * 1.1
                + Math.max(0, this.gameState.policies.incomeTax - 28) * 0.45
                + treasuryPenalty
                + phaseCompression * 0.35,
                10,
                95
            ),
            livingStandards: this.clamp(
                30
                - this.gameState.performanceMetrics.gdpGrowth * 7
                + this.gameState.performanceMetrics.unemployment * 5.2
                + this.gameState.performanceMetrics.nhsWaitingTimes * 0.95
                + this.gameState.policies.incomeTax * 0.52
                + regionalFragility
                + phaseCompression * 0.6,
                10,
                95
            ),
            immigration: this.clamp(
                26
                + Math.abs(this.gameState.policies.immigration - 52) * 0.85
                + Math.max(0, 42 - this.gameState.approvalRating) * 0.4
                + Math.max(0, 55 - this.getAverageCabinetLoyalty()) * 0.15
                + securityPenalty
                + pendingEventPressure
                + phaseCompression * 0.5,
                10,
                95
            ),
            climate: this.clamp(
                68
                - this.gameState.performanceMetrics.climateProgress
                + Math.max(0, 24 - this.gameState.performanceMetrics.gdpGrowth * 4)
                + Math.max(0, 23 - this.gameState.policies.corporationTax) * 0.5
                + greenPenalty
                + queuePressure * 0.35
                + phaseCompression * 0.2,
                10,
                95
            ),
            security: this.clamp(
                22
                + this.gameState.performanceMetrics.crimeRate * 1.05
                + Math.max(0, 58 - this.gameState.policies.policeFunding) * 0.34
                + Math.max(0, 52 - this.gameState.governmentStability) * 0.22
                + securityPenalty
                + regionalFragility * 0.45
                + phaseCompression * 0.4,
                10,
                95
            )
        };
    }

    applyNationalMoodDrift(issuePressures, multiplier = 1) {
        const phaseKey = this.getCampaignPhaseKey();
        const floatingPhaseMultiplier = {
            opening: 0.96,
            delivery: 1,
            holding: 1.08,
            'run-in': 1.18
        }[phaseKey] || 1;
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
            'Floating Voters': (
                economyRelief * 0.8
                + livingRelief * 0.75
                + serviceRelief * 0.65
                + competenceRelief * 0.65
                + securityRelief * 0.25
            ) * floatingPhaseMultiplier
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

    getMetricLabel(metricKey) {
        return {
            nhsWaitingTimes: 'NHS waits',
            educationStandards: 'Education',
            crimeRate: 'Crime',
            gdpGrowth: 'Growth',
            unemployment: 'Jobs',
            climateProgress: 'Climate'
        }[metricKey] || metricKey;
    }

    getCampaignPhaseKey(monthsToElection = this.calculateMonthsToElection()) {
        if (monthsToElection <= 6) return 'run-in';
        if (monthsToElection <= 12) return 'holding';
        if (monthsToElection <= 18) return 'delivery';
        return 'opening';
    }

    createFactionMomentumState(source = {}) {
        return {
            service: source.service ?? 0,
            treasury: source.treasury ?? 0,
            security: source.security ?? 0,
            green: source.green ?? 0
        };
    }

    getFactionLabel(factionKey) {
        return this.factionProfiles[factionKey]?.name || factionKey;
    }

    getScenarioScriptedMoments() {
        const scenario = this.scenarios[this.gameState.scenarioId] || {};
        return Array.isArray(scenario.scriptedMoments) ? scenario.scriptedMoments : [];
    }

    getNextScriptedMoment() {
        const monthsToElection = this.calculateMonthsToElection();
        const seen = new Set(this.gameState.scriptedMomentsSeen || []);
        const pendingId = this.gameState.pendingEvent?.id;

        return this.getScenarioScriptedMoments()
            .filter((moment) => !seen.has(moment.id) || pendingId === moment.id)
            .map((moment) => {
                const target = typeof moment.trigger?.monthsToElection === 'number'
                    ? moment.trigger.monthsToElection
                    : null;
                const distance = target == null ? Number.POSITIVE_INFINITY : monthsToElection - target;
                return { ...moment, distance };
            })
            .sort((a, b) => {
                const aPenalty = a.distance < 0 && pendingId !== a.id ? 1000 : 0;
                const bPenalty = b.distance < 0 && pendingId !== b.id ? 1000 : 0;
                return (a.distance + aPenalty) - (b.distance + bPenalty);
            })[0] || null;
    }

    buildCampaignTimeline() {
        const moments = this.getScenarioScriptedMoments();
        const monthsToElection = this.calculateMonthsToElection();
        const seen = new Set(this.gameState.scriptedMomentsSeen || []);
        const pendingId = this.gameState.pendingEvent?.id;

        if (!moments.length) {
            return [
                {
                    status: 'complete',
                    label: 'Campaign opening',
                    title: 'Government takes shape',
                    detail: 'Use the story, compass, and monthly highlights together to understand what this run is becoming.'
                },
                {
                    status: monthsToElection <= 12 ? 'live' : 'upcoming',
                    label: 'Mid-campaign pressure',
                    title: 'Delivery versus drift',
                    detail: 'As the election gets closer, visible delivery matters more than clean explanation.'
                },
                {
                    status: monthsToElection <= 6 ? 'live' : 'upcoming',
                    label: 'Election run-in',
                    title: 'Final judgement',
                    detail: 'The closing months compress every success and failure into one argument about whether you deserve another term.'
                }
            ];
        }

        return moments.map((moment) => {
            const target = typeof moment.trigger?.monthsToElection === 'number'
                ? moment.trigger.monthsToElection
                : null;
            const isLive = pendingId === moment.id;
            const isComplete = seen.has(moment.id) && !isLive;
            const monthsUntil = target == null ? null : monthsToElection - target;

            let status = 'upcoming';
            let detail = moment.timelineSummary || moment.impact;

            if (isLive) {
                status = 'live';
                detail = `Live now. ${moment.timelineSummary || moment.impact}`;
            } else if (isComplete) {
                status = 'complete';
                detail = `Completed. ${moment.timelineSummary || moment.impact}`;
            } else if (monthsUntil === 0) {
                status = 'live';
                detail = `Due this month. ${moment.timelineSummary || moment.impact}`;
            } else if (typeof monthsUntil === 'number' && monthsUntil > 0) {
                detail = `${monthsUntil} month${monthsUntil === 1 ? '' : 's'} away. ${moment.timelineSummary || moment.impact}`;
            } else if (typeof monthsUntil === 'number' && monthsUntil < 0) {
                detail = `Window has passed. ${moment.timelineSummary || moment.impact}`;
            }

            return {
                status,
                label: moment.timelineLabel || (target == null ? 'Campaign checkpoint' : `${target} months to election`),
                title: moment.timelineTitle || moment.title,
                detail
            };
        });
    }

    createFactionState(scenario) {
        const base = scenario.factions || {};
        return {
            service: base.service ?? 56,
            treasury: base.treasury ?? 52,
            security: base.security ?? 48,
            green: base.green ?? 50
        };
    }

    buildFactionState() {
        const scenario = this.scenarios[this.gameState.scenarioId] || {};
        const base = this.createFactionState(scenario);
        const momentum = this.createFactionMomentumState(this.gameState.factionMomentum);
        return {
            service: this.clamp(
                base.service * 0.32
                + momentum.service
                + 12
                + this.gameState.policies.nhsFunding * 0.26
                + this.gameState.policies.socialCare * 0.18
                + this.gameState.policies.schoolFunding * 0.16
                - this.gameState.performanceMetrics.nhsWaitingTimes * 0.7,
                18,
                88
            ),
            treasury: this.clamp(
                base.treasury * 0.34
                + momentum.treasury
                + 18
                + this.gameState.performanceMetrics.gdpGrowth * 8.5
                - this.gameState.performanceMetrics.unemployment * 3.2
                - Math.max(0, this.gameState.policies.nhsFunding - 58) * 0.36
                - Math.max(0, this.gameState.policies.schoolFunding - 60) * 0.28
                - this.gameState.implementationQueue.length * 1.2,
                16,
                86
            ),
            security: this.clamp(
                base.security * 0.36
                + momentum.security
                + 15
                + this.gameState.policies.policeFunding * 0.22
                + (100 - Math.abs(this.gameState.policies.immigration - 58) * 1.15) * 0.2
                + this.gameState.governmentStability * 0.12
                - this.gameState.performanceMetrics.crimeRate * 0.16,
                16,
                86
            ),
            green: this.clamp(
                base.green * 0.34
                + momentum.green
                + 15
                + this.gameState.performanceMetrics.climateProgress * 0.38
                + this.gameState.policies.schoolFunding * 0.08
                + this.gameState.policies.socialCare * 0.06
                - Math.max(0, this.gameState.policies.immigration - 60) * 0.15,
                18,
                88
            )
        };
    }

    getAverageFactionSupport() {
        const factions = this.gameState.factions || this.buildFactionState();
        return Object.values(factions).reduce((total, support) => total + support, 0) / Object.keys(factions).length;
    }

    getWeakestFaction() {
        const factions = this.gameState.factions || this.buildFactionState();
        return Object.entries(factions).reduce((weakest, [key, support]) => {
            if (!weakest || support < weakest.support) {
                return { key, support, ...this.factionProfiles[key] };
            }
            return weakest;
        }, null);
    }

    getStrongestFaction() {
        const factions = this.gameState.factions || this.buildFactionState();
        return Object.entries(factions).reduce((strongest, [key, support]) => {
            if (!strongest || support > strongest.support) {
                return { key, support, ...this.factionProfiles[key] };
            }
            return strongest;
        }, null);
    }

    getTopPressureIssue() {
        const issuePressures = this.gameState.issuePressures || this.buildIssuePressures();
        return Object.entries(issuePressures).reduce((top, [key, score]) => {
            if (!top || score > top.score) return { key, score };
            return top;
        }, null);
    }

    getStrongestRegion() {
        return Object.entries(this.gameState.regionalSupport).reduce((best, [key, support]) => {
            if (!best || support > best.support) return { key, support };
            return best;
        }, null);
    }

    getWeakestRegion() {
        return Object.entries(this.gameState.regionalSupport).reduce((worst, [key, support]) => {
            if (!worst || support < worst.support) return { key, support };
            return worst;
        }, null);
    }

    getDefaultOpeningHighlights(scenario) {
        return [
            `${scenario.name} is live. Use the title flow and quickstart panel to orient yourself.`,
            'National mood, party pressure, and election horizon should now be read together rather than separately.',
            'The best first move is usually one visible service or cost-of-living intervention, not a scattergun reset.'
        ];
    }

    buildCampaignStory() {
        const monthsToElection = this.calculateMonthsToElection();
        const scenario = this.scenarios[this.gameState.scenarioId] || {};
        const topIssue = this.getTopPressureIssue();
        const weakestFaction = this.getWeakestFaction();
        const strongestRegion = this.getStrongestRegion();
        const nextCheckpoint = this.getNextScriptedMoment();

        let phase = 'Opening chapter';
        let summary = 'The government still has time to define competence before the run-in takes over everything.';
        let headline = 'Reset the weather before the horizon closes.';
        let notes = [
            `Top national pressure: ${this.getIssueLabel(topIssue.key)} at ${Math.round(topIssue.score)}.`,
            `Most fragile bloc: ${weakestFaction.name} at ${Math.round(weakestFaction.support)} support.`,
            `Best regional footing: ${strongestRegion.key} at ${Math.round(strongestRegion.support)} support.`
        ];

        if (monthsToElection <= 18 && monthsToElection > 12) {
            phase = 'Delivery window';
            headline = 'Visible delivery now matters more than message discipline.';
            summary = 'This is the stretch where a government either starts to look real again or becomes trapped in explanation.';
        } else if (monthsToElection <= 12 && monthsToElection > 6) {
            phase = 'Holding nerve';
            headline = 'The campaign is no longer theoretical.';
            summary = 'Every wobble now feeds Westminster gossip, media framing, and voter expectation at the same time.';
        } else if (monthsToElection <= 6) {
            phase = 'Election run-in';
            headline = 'Every month is now a judgement on whether you deserve another term.';
            summary = 'The final stretch is about surviving shocks, looking decisive, and denying the opposition a clean change argument.';
        }

        if (scenario.id === 'long-campaign') {
            notes = [
                'This is the featured demo run: two years, one flagship campaign, and a premium-feeling judgment arc.',
                `Right now ${this.getIssueLabel(topIssue.key).toLowerCase()} is the centre of political gravity.`,
                `${weakestFaction.name} are the bloc most likely to make the government look divided first.`,
                nextCheckpoint
                    ? `Next authored checkpoint: ${nextCheckpoint.timelineTitle || nextCheckpoint.title} (${nextCheckpoint.timelineLabel || 'campaign milestone'}).`
                    : 'The final authored checkpoints are complete. The rest is about holding the closing argument together.'
            ];
        }

        return {
            phase,
            summary,
            headline,
            kicker: scenario.id === 'long-campaign' ? 'Featured campaign demo' : 'Campaign briefing',
            notes
        };
    }

    buildCampaignCompass() {
        const topIssue = this.getTopPressureIssue();
        const weakestFaction = this.getWeakestFaction();
        const strongestFaction = this.getStrongestFaction();
        const strongestRegion = this.getStrongestRegion();
        const weakestRegion = this.getWeakestRegion();
        const nextCheckpoint = this.getNextScriptedMoment();

        return [
            {
                label: 'Forecast',
                value: `${this.calculateProjectedSeats()} projected seats`,
                detail: `Election outlook: ${this.getElectionOutlook().toLowerCase()}.`
            },
            {
                label: 'Top risk',
                value: this.getIssueLabel(topIssue.key),
                detail: `${Math.round(topIssue.score)} pressure. This is where the narrative is currently hardest to shift.`
            },
            {
                label: 'Party fault line',
                value: weakestFaction.name,
                detail: `${Math.round(weakestFaction.support)} support. ${weakestFaction.description}`
            },
            {
                label: 'Best footing',
                value: strongestRegion.key,
                detail: `${Math.round(strongestRegion.support)} support, while ${weakestRegion.key} remains the thinnest ground.`
            },
            {
                label: 'Most settled bloc',
                value: strongestFaction.name,
                detail: `${Math.round(strongestFaction.support)} support. This is the wing currently least likely to spook.`
            },
            {
                label: 'Next checkpoint',
                value: nextCheckpoint ? (nextCheckpoint.timelineTitle || nextCheckpoint.title) : 'Closing stretch',
                detail: nextCheckpoint
                    ? `${nextCheckpoint.timelineLabel || 'Campaign milestone'}. ${nextCheckpoint.timelineSummary || nextCheckpoint.impact}`
                    : 'All authored milestones are complete. The final task is to protect the result.'
            }
        ];
    }

    getIssuePriorityFrame(issueKey) {
        const frames = {
            publicServices: {
                title: 'Take the heat out of public services',
                detail: 'Visible NHS or school delivery still moves the story faster than another clean speech.',
                action: 'Bank one practical service win before the next round of Westminster noise.'
            },
            economy: {
                title: 'Keep the economy looking steady',
                detail: 'Treasury confidence and voter confidence tend to slip together when growth looks fragile.',
                action: 'Avoid a fiscal wobble and make competence feel more tangible than drift.'
            },
            livingStandards: {
                title: 'Show households a practical gain',
                detail: 'Voters forgive a lot less when day-to-day pressure still feels personal.',
                action: 'Prioritise a move that looks like relief in ordinary life, not just macro management.'
            },
            immigration: {
                title: 'Look orderly on borders and control',
                detail: 'This issue widens quickly into a broader argument about whether the government is in charge.',
                action: 'Project grip, not panic, and avoid feeding the sense of drift.'
            },
            climate: {
                title: 'Make clean growth feel real',
                detail: 'Climate only helps when it looks tangible, future-facing, and economically serious.',
                action: 'Tie climate progress to visible infrastructure, jobs, or lower pressure elsewhere.'
            },
            security: {
                title: 'Restore a visible sense of order',
                detail: 'Security pressure becomes political very quickly once competence starts to look brittle.',
                action: 'Show grip in public-facing services and avoid a vacuum around authority.'
            }
        };
        return frames[issueKey] || {
            title: 'Hold the centre of the argument',
            detail: 'The government needs a clean, visible reason to look competent this month.',
            action: 'Choose one thing the public can actually feel.'
        };
    }

    getRegionalCampaignCue(region, topIssueKey) {
        const regionFrames = {
            'Scotland': 'A coalition of competence, reform, and future-facing seriousness matters more here than raw tribal appeal.',
            'Northern England': 'Visible delivery and a sense of practical grip tend to cut through faster than Westminster framing.',
            'Midlands': 'Swing voters here are highly sensitive to competence, cost of living, and whether the government feels normal.',
            'Wales': 'Public services and proof of governing seriousness carry more weight than abstract positioning.',
            'London': 'A progressive but demanding electorate expects competence, modernisation, and a reason to stay engaged.',
            'South': 'Moderation, stability, and everyday reassurance matter more than ideological theatre.'
        };
        const issueFrames = {
            publicServices: 'Lead with visible service competence.',
            economy: 'Reinforce steadiness and practical growth.',
            livingStandards: 'Translate the pitch into household relief.',
            immigration: 'Show control without sounding panicked.',
            climate: 'Make the future feel practical rather than symbolic.',
            security: 'Project grip and visible order.'
        };
        return `${regionFrames[region] || 'This region needs a reason to believe the government still has a handle on events.'} ${issueFrames[topIssueKey] || 'Give the electorate a clear practical story.'}`;
    }

    buildCampaignPriorities() {
        const topIssue = this.getTopPressureIssue();
        const weakestFaction = this.getWeakestFaction();
        const nextCheckpoint = this.getNextScriptedMoment();
        const queue = [...(this.gameState.implementationQueue || [])]
            .sort((a, b) => a.monthsRemaining - b.monthsRemaining || b.progress - a.progress);
        const leadDelivery = queue[0];
        const topIssueFrame = this.getIssuePriorityFrame(topIssue.key);
        const monthsToElection = this.calculateMonthsToElection();
        const priorities = [
            {
                tone: this.getPressureTone(topIssue.score),
                label: 'Immediate',
                title: topIssueFrame.title,
                detail: `${this.getIssueLabel(topIssue.key)} pressure is ${Math.round(topIssue.score)}. ${topIssueFrame.detail}`,
                action: topIssueFrame.action
            }
        ];

        if (leadDelivery) {
            priorities.push({
                tone: leadDelivery.progress >= 65 ? 'info' : 'warning',
                label: 'Delivery',
                title: `Land ${leadDelivery.policy}`,
                detail: `${leadDelivery.progress}% complete with ${leadDelivery.monthsRemaining} month${leadDelivery.monthsRemaining === 1 ? '' : 's'} remaining. A visible delivery moment helps the government look real again.`,
                action: 'Protect at least one implementation lane so the campaign is not all explanation.'
            });
        } else {
            priorities.push({
                tone: 'warning',
                label: 'Delivery',
                title: 'Put a flagship reform into motion',
                detail: 'There is no live implementation queue carrying a visible win toward the electorate right now.',
                action: 'Queue one clear reform so the next few turns are not just reactive politics.'
            });
        }

        priorities.push({
            tone: weakestFaction.support >= 54 ? 'info' : weakestFaction.support >= 40 ? 'warning' : 'error',
            label: 'Party',
            title: `Keep ${weakestFaction.name} on side`,
            detail: `${Math.round(weakestFaction.support)} support. ${weakestFaction.description}`,
            action: weakestFaction.support >= 54
                ? 'This bloc is uneasy rather than mutinous, so avoid spooking it needlessly.'
                : 'A visible wobble here will bleed into the national story if it is left unattended.'
        });

        if (nextCheckpoint) {
            const target = typeof nextCheckpoint.trigger?.monthsToElection === 'number'
                ? nextCheckpoint.trigger.monthsToElection
                : null;
            const distance = target == null ? null : monthsToElection - target;
            priorities.push({
                tone: distance === 0 ? 'warning' : distance != null && distance <= 3 ? 'info' : 'success',
                label: 'Checkpoint',
                title: nextCheckpoint.timelineTitle || nextCheckpoint.title,
                detail: distance == null
                    ? `${nextCheckpoint.timelineSummary || nextCheckpoint.impact}`
                    : `${distance === 0 ? 'Due now' : `${distance} month${distance === 1 ? '' : 's'} away`}. ${nextCheckpoint.timelineSummary || nextCheckpoint.impact}`,
                action: 'Shape the next few turns so this milestone lands on your terms rather than the opposition’s.'
            });
        }

        return priorities.slice(0, 4);
    }

    buildPressureFronts() {
        const topIssue = this.getTopPressureIssue();
        const issuePressures = this.gameState.issuePressures || this.buildIssuePressures();
        const weakestFaction = this.getWeakestFaction();
        const weakestRegion = this.getWeakestRegion();
        const monthsToElection = this.calculateMonthsToElection();
        const nextCheckpoint = this.getNextScriptedMoment();
        const leadDelivery = [...(this.gameState.implementationQueue || [])]
            .sort((a, b) => a.monthsRemaining - b.monthsRemaining || b.progress - a.progress)[0];
        const seatEstimate = this.getRegionalSeatEstimate(weakestRegion.key, weakestRegion.support);
        const combinedIssuePressure = Math.round(
            (issuePressures[topIssue.key] + Object.values(issuePressures).sort((a, b) => b - a)[1]) / 2
        );
        const machinePressure = this.clamp(
            100
            - weakestFaction.support
            + this.gameState.implementationQueue.length * 6
            + Math.max(0, 56 - this.getAverageCabinetLoyalty()) * 0.9,
            18,
            92
        );
        const mapPressure = this.clamp(
            (46 - weakestRegion.support) * 3.4
            + Math.max(0, 326 - this.calculateProjectedSeats()) * 0.22
            + Math.max(0, 4 - monthsToElection) * 6,
            18,
            94
        );

        return [
            {
                tone: this.getPressureTone(combinedIssuePressure),
                label: monthsToElection <= 4 ? 'Closing argument' : 'National front',
                title: `${this.getIssueLabel(topIssue.key)} is setting the weather`,
                value: `${Math.round(issuePressures[topIssue.key])} pressure`,
                detail: monthsToElection <= 4
                    ? `In the final stretch, ${this.getIssueLabel(topIssue.key).toLowerCase()} is the lens through which swing voters are reading everything else.`
                    : `${this.getIssueLabel(topIssue.key)} remains the hardest national story to bend, and it is dragging the rest of the agenda with it.`,
                action: this.getIssuePriorityFrame(topIssue.key).action
            },
            {
                tone: this.getPressureTone(machinePressure),
                label: 'Government machine',
                title: leadDelivery ? `Land ${leadDelivery.policy}` : `Hold ${weakestFaction.name} together`,
                value: `${Math.round(machinePressure)} pressure`,
                detail: leadDelivery
                    ? `${weakestFaction.name} are at ${Math.round(weakestFaction.support)} support while ${leadDelivery.policy} is ${leadDelivery.progress}% complete with ${leadDelivery.monthsRemaining} month${leadDelivery.monthsRemaining === 1 ? '' : 's'} left.`
                    : `${weakestFaction.name} are at ${Math.round(weakestFaction.support)} support and there is no obvious delivery lane left to stabilise the campaign.`,
                action: nextCheckpoint && monthsToElection <= 4
                    ? `Set up ${nextCheckpoint.timelineTitle || nextCheckpoint.title} so the machine looks deliberate rather than overloaded.`
                    : 'Keep one visible implementation lane alive and stop internal nerves becoming public character.'
            },
            {
                tone: this.getPressureTone(mapPressure),
                label: 'Electoral map',
                title: `${weakestRegion.key} is the soft edge of the coalition`,
                value: `${seatEstimate} seats in play`,
                detail: `${Math.round(weakestRegion.support)} support leaves ${weakestRegion.key} exposed, and the regional conversation is now being shaped by ${this.getIssueLabel(topIssue.key).toLowerCase()}.`,
                action: `${this.getRegionalCampaignCue(weakestRegion.key, topIssue.key)}`
            }
        ];
    }

    buildBattlegrounds() {
        const topIssue = this.getTopPressureIssue();
        const seatPools = {
            'Scotland': 57,
            'Northern England': 118,
            'Midlands': 108,
            'Wales': 32,
            'London': 75,
            'South': 220
        };

        return Object.entries(this.gameState.regionalSupport)
            .map(([region, support]) => {
                let status = 'Bank';
                let tone = 'success';
                if (support < 38) {
                    status = 'Defensive';
                    tone = 'error';
                } else if (support < 46) {
                    status = 'Battleground';
                    tone = 'warning';
                } else if (support < 55) {
                    status = 'Hold';
                    tone = 'info';
                }

                const seatPool = seatPools[region] || 50;
                const seatEstimate = this.getRegionalSeatEstimate(region, support);
                const strategicScore = seatPool * 0.55 - Math.abs(support - 46) * 2.8 - Math.max(0, support - 58) * 4.5;

                return {
                    region,
                    support: Math.round(support),
                    status,
                    tone,
                    seatEstimate,
                    detail: `${seatEstimate} projected seats from a ${seatPool}-seat battleground pool. ${this.getRegionalCampaignCue(region, topIssue.key)}`,
                    strategicScore
                };
            })
            .sort((a, b) => b.strategicScore - a.strategicScore)
            .slice(0, 4);
    }

    getDecisiveSwingBloc() {
        const outcome = this.gameState.electionResult?.outcome;
        const blocFrames = [
            {
                key: 'Floating Voters',
                label: 'Floating voters',
                target: 35,
                weight: 1.65,
                successDetail: 'This is the closest thing to a broad national permission slip, so holding it up mattered more than pleasing any single loyal camp.',
                failureDetail: 'This is where the wider electorate decided whether another term still felt safe, and it never moved far enough back toward you.'
            },
            {
                key: 'Labour Supporters',
                label: 'Labour base',
                target: 63,
                weight: 0.92,
                successDetail: 'The core vote stayed engaged enough to stop the campaign from looking hollow in its own colours.',
                failureDetail: 'The base never sounded fully convinced, which made the whole campaign look less certain of itself.'
            },
            {
                key: 'LibDem Supporters',
                label: 'Liberal tactical voters',
                target: 40,
                weight: 1.08,
                successDetail: 'This bloc gave the government enough moderate oxygen to keep the anti-Tory case politically usable.',
                failureDetail: 'This bloc never trusted the offer quite enough, which narrowed the room for a cleaner anti-opposition coalition.'
            },
            {
                key: 'Green Supporters',
                label: 'Progressive flank',
                target: 42,
                weight: 0.86,
                successDetail: 'The progressive flank stayed sufficiently on side that the campaign did not bleed moral energy in the run-in.',
                failureDetail: 'The progressive flank stayed too cool, which weakened the sense that the coalition still had emotional conviction.'
            }
        ];
        const evaluated = blocFrames.map((bloc) => {
            const support = this.gameState.voterApproval[bloc.key] ?? 0;
            const gap = support - bloc.target;
            return {
                ...bloc,
                support,
                gap,
                deficitScore: Math.max(0, -gap) * bloc.weight,
                surplusScore: Math.max(0, gap) * bloc.weight
            };
        });

        if (outcome === 'Majority Government') {
            return evaluated.sort((a, b) => b.surplusScore - a.surplusScore)[0] || evaluated[0];
        }

        const deficitPick = evaluated
            .filter((bloc) => bloc.deficitScore > 0)
            .sort((a, b) => b.deficitScore - a.deficitScore)[0];

        return deficitPick || evaluated.find((bloc) => bloc.key === 'Floating Voters') || evaluated[0];
    }

    getDecisiveBattleground() {
        const battlegrounds = Array.isArray(this.gameState.battlegrounds) && this.gameState.battlegrounds.length
            ? this.gameState.battlegrounds
            : this.buildBattlegrounds();
        return battlegrounds[0] || null;
    }

    getElectionLeadSummary() {
        const outcome = this.gameState.electionResult?.outcome;
        const topIssue = this.getTopPressureIssue();
        const decisiveBattleground = this.getDecisiveBattleground();

        if (outcome === 'Majority Government') {
            return `You converted ${this.getIssueLabel(topIssue.key).toLowerCase()} pressure into a governable verdict, and ${decisiveBattleground?.region || 'the key battlegrounds'} held just strongly enough to turn credibility into authority.`;
        }
        if (outcome === 'Minority Government') {
            return `You stayed alive on the map, but ${this.getIssueLabel(topIssue.key).toLowerCase()} pressure and a soft ${decisiveBattleground?.region || 'battleground'} finish denied the campaign real comfort.`;
        }
        if (outcome === 'Hung Parliament') {
            return `The country withheld a clean mandate. The government survived the collapse scenario, but the closing argument never fully broke through on ${this.getIssueLabel(topIssue.key).toLowerCase()}.`;
        }
        if (outcome === 'Vote of No Confidence') {
            return `Authority gave way before election day. ${this.getIssueLabel(topIssue.key)} became the pressure under which the parliamentary coalition finally snapped.`;
        }
        return `The electorate decided the government had not done enough to earn another term, and ${this.getIssueLabel(topIssue.key).toLowerCase()} became the lens through which everything else was judged.`;
    }

    buildElectionResultSignals() {
        const topIssue = this.getTopPressureIssue();
        const decisiveBattleground = this.getDecisiveBattleground();
        const decisiveBloc = this.getDecisiveSwingBloc();
        const weakestFaction = this.getWeakestFaction();
        const blocTone = decisiveBloc
            ? (decisiveBloc.gap >= 0 ? 'success' : decisiveBloc.gap >= -2 ? 'warning' : 'error')
            : 'info';
        const factionTone = weakestFaction.support >= 54 ? 'info' : weakestFaction.support >= 40 ? 'warning' : 'error';

        return [
            {
                tone: this.getPressureTone(topIssue.score),
                label: 'Closing pressure',
                value: this.getIssueLabel(topIssue.key),
                detail: `${Math.round(topIssue.score)} pressure at the end of the campaign.`
            },
            {
                tone: decisiveBattleground?.tone || 'info',
                label: 'Map hinge',
                value: decisiveBattleground ? `${decisiveBattleground.region} ${decisiveBattleground.support}%` : 'Battleground region',
                detail: decisiveBattleground
                    ? `${decisiveBattleground.seatEstimate} projected seats in the decisive battleground.`
                    : 'One soft region still decided the emotional shape of the verdict.'
            },
            {
                tone: blocTone,
                label: 'Decisive swing bloc',
                value: decisiveBloc ? `${decisiveBloc.label} ${Math.round(decisiveBloc.support)}%` : 'Floating voters',
                detail: decisiveBloc
                    ? `${decisiveBloc.gap >= 0 ? '+' : ''}${Math.round(decisiveBloc.gap)} against the late-campaign permission threshold.`
                    : 'The broader swing electorate remained the final permission test.'
            },
            {
                tone: factionTone,
                label: 'Party fault line',
                value: `${weakestFaction.name} ${Math.round(weakestFaction.support)}%`,
                detail: 'The hardest internal bloc to keep calm in the closing stretch.'
            }
        ];
    }

    buildTurnHighlights({ approvalDelta = 0, changes = null, completed = [], event = null, choice = null } = {}) {
        const topIssue = this.getTopPressureIssue();
        const weakestFaction = this.getWeakestFaction();
        const strongestRegion = this.getStrongestRegion();
        const highlights = [];

        if (changes?.changes?.length) {
            highlights.push(`Cabinet committed ${changes.spent} political capital across ${changes.changes.length} policy shift${changes.changes.length === 1 ? '' : 's'}.`);
        } else {
            highlights.push('No cabinet reset landed this month, so political capital was largely banked.');
        }

        if (completed?.length) {
            highlights.push(`Delivered this month: ${completed.join(', ')}.`);
        }

        if (event && choice) {
            highlights.push(`${event.title}: ${choice.label}. ${choice.summary}`);
        } else if (event) {
            highlights.push(`${event.title} is now the live crisis at the centre of the agenda.`);
        }

        const factionShift = Object.entries(choice?.effects?.factions || {})
            .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
        if (factionShift) {
            const [factionKey, delta] = factionShift;
            highlights.push(`Party reaction: ${this.getFactionLabel(factionKey)} ${delta > 0 ? '+' : ''}${Math.round(delta)}.`);
        }

        if (!event || choice) {
            if (approvalDelta > 0) highlights.push(`Approval is up ${approvalDelta}; the map now leans best toward ${strongestRegion.key}.`);
            else if (approvalDelta < 0) highlights.push(`Approval is down ${Math.abs(approvalDelta)}; ${strongestRegion.key} is still the strongest region but the room is tightening.`);
            else highlights.push('Approval is broadly flat, which means clarity and narrative are doing most of the work this month.');
        }

        highlights.push(`Top pressure remains ${this.getIssueLabel(topIssue.key).toLowerCase()}, while ${weakestFaction.name} are the bloc most likely to crack first.`);
        return highlights.slice(0, 4);
    }

    describeEffectSummary(effects, options = {}) {
        const compact = options.compact ?? false;
        const parts = [];

        if (effects.governmentStability) {
            parts.push(`Stability ${effects.governmentStability > 0 ? '+' : ''}${Math.round(effects.governmentStability)}`);
        }
        if (effects.approvalRating) {
            parts.push(`Approval ${effects.approvalRating > 0 ? '+' : ''}${Math.round(effects.approvalRating)}`);
        }
        if (effects.politicalCapital) {
            parts.push(`PC ${effects.politicalCapital > 0 ? '+' : ''}${Math.round(effects.politicalCapital)}`);
        }

        const voterEffects = Object.entries(effects.voterApproval || {})
            .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
            .slice(0, compact ? 1 : 2)
            .map(([group, delta]) => `${group.replace(' Supporters', '')} ${delta > 0 ? '+' : ''}${Math.round(delta)}`);
        parts.push(...voterEffects);

        const factionEffects = Object.entries(effects.factions || {})
            .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
            .slice(0, compact ? 1 : 2)
            .map(([faction, delta]) => `${this.getFactionLabel(faction)} ${delta > 0 ? '+' : ''}${Math.round(delta)}`);
        parts.push(...factionEffects);

        const metricEffects = Object.entries(effects.performanceMetrics || effects.metrics || {})
            .slice(0, compact ? 1 : 2)
            .map(([metric, delta]) => `${this.getMetricLabel(metric)} ${delta > 0 ? 'up' : 'down'}`);
        parts.push(...metricEffects);

        if (!parts.length) {
            parts.push('Mostly narrative and political tone effects');
        }

        return parts.slice(0, compact ? 3 : 5);
    }

    buildMediaNarrative(issuePressures) {
        const rankedIssues = Object.entries(issuePressures).sort((a, b) => b[1] - a[1]);
        const [topIssue, topScore] = rankedIssues[0];
        const [secondIssue] = rankedIssues[1];
        const weakestRegion = Object.entries(this.gameState.regionalSupport).sort((a, b) => a[1] - b[1])[0]?.[0] || 'the Midlands';
        const cabinetAverage = Math.round(this.getAverageCabinetLoyalty());
        const weakestFaction = this.getWeakestFaction();
        const phaseKey = this.getCampaignPhaseKey();
        const nextCheckpoint = this.getNextScriptedMoment();
        const implementationLoad = this.gameState.implementationQueue.length;
        const phaseContext = {
            opening: {
                summary: 'There is still enough runway to reset the mood, but only if delivery becomes tangible before the calendar tightens.',
                cue: 'You still have time to reset the weather, so'
            },
            delivery: {
                summary: 'This is the delivery window, where the electorate judges the machine more than the message.',
                cue: 'This is the stretch where'
            },
            holding: {
                summary: 'The campaign is now real, so every wobble immediately reinforces a story about whether the government has the nerve for another term.',
                cue: 'With the campaign tightening,'
            },
            'run-in': {
                summary: 'Election time is compressing every signal into a verdict about whether the country wants more of the same.',
                cue: 'In the final run-in,'
            }
        };
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
        const partyLine = weakestFaction.support >= 54
            ? `The weakest internal bloc is ${weakestFaction.name}, but it is not yet strong enough to become the whole story.`
            : `The weakest internal bloc is ${weakestFaction.name} at ${Math.round(weakestFaction.support)} support, so party management is now part of the national narrative too.`;
        const phaseFrame = phaseContext[phaseKey];

        return {
            headline: narrative.headline,
            summary: `${narrative.summary} ${phaseFrame.summary}`,
            tone,
            talkingPoints: [
                narrative.attack,
                `Cabinet cohesion is averaging ${cabinetAverage}, and ${partyLine}`,
                `${phaseFrame.cue} the next visible gain needs to land on ${this.getIssueLabel(topIssue).toLowerCase()} before ${this.getIssueLabel(secondIssue).toLowerCase()} drags the conversation wider.`,
                nextCheckpoint
                    ? `${implementationLoad >= 3 ? 'The machine looks busy enough to wobble, so' : 'There is still just enough room to shape'} ${nextCheckpoint.timelineTitle || nextCheckpoint.title} on your own terms.`
                    : `There are no authored checkpoints left, so the only remaining question is whether the closing machine looks steady enough to survive.`
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
        this.gameState.factions = this.buildFactionState();
        this.gameState.mediaNarrative = this.buildMediaNarrative(this.gameState.issuePressures);
        this.gameState.campaignStory = this.buildCampaignStory();
        this.gameState.campaignCompass = this.buildCampaignCompass();
        this.gameState.campaignTimeline = this.buildCampaignTimeline();
        this.gameState.campaignPriorities = this.buildCampaignPriorities();
        this.gameState.pressureFronts = this.buildPressureFronts();
        this.gameState.battlegrounds = this.buildBattlegrounds();
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
        const score = this.gameState.approvalRating
            + this.gameState.governmentStability * 0.35
            + this.getAverageFactionSupport() * 0.08;
        if (score >= 96) return 'Strong majority';
        if (score >= 84) return 'Narrow lead';
        if (score >= 76) return 'Hung parliament likely';
        if (score >= 68) return 'At risk';
        return 'Defeat looming';
    }

    buildTurnSummary(approvalDelta, changes, completed, event) {
        const parts = [];
        const weakestFaction = this.getWeakestFaction();
        if (changes.changes.length) parts.push(`You spent ${changes.spent} political capital on ${changes.changes.length} policy change${changes.changes.length === 1 ? '' : 's'}.`);
        else parts.push('You held your policy line this month and conserved political capital.');
        if (completed.length) parts.push(`${completed.join(', ')} ${completed.length === 1 ? 'has' : 'have'} now taken effect.`);
        if (event) parts.push(`${event.title} has broken into the centre of the political agenda.`);
        if (approvalDelta > 0) parts.push(`National approval rose by ${approvalDelta} point${approvalDelta === 1 ? '' : 's'}.`);
        else if (approvalDelta < 0) parts.push(`National approval fell by ${Math.abs(approvalDelta)} point${Math.abs(approvalDelta) === 1 ? '' : 's'}.`);
        else parts.push('The national mood was broadly unchanged.');
        if (this.gameState.mediaNarrative?.headline) parts.push(`Narrative: ${this.gameState.mediaNarrative.headline}`);
        parts.push(`Most fragile party bloc: ${weakestFaction.name.toLowerCase()}.`);
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
        const topIssue = this.getTopPressureIssue();
        const weakestFaction = this.getWeakestFaction();
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
        this.gameState.lastTurnHighlights = [
            'The parliamentary party concluded the government could not continue.',
            `Projected seats collapse to ${projectedSeats}.`,
            `The closing fault line was ${weakestFaction.name} at ${Math.round(weakestFaction.support)} support.`,
            `Authority finally snapped under ${this.getIssueLabel(topIssue.key).toLowerCase()} pressure.`,
            `Legacy score closes at ${this.gameState.legacyScore}.`,
            'This is the hardest failure state in the demo and it comes from ignored authority warnings.'
        ];
        this.logLedgerEntry(
            'Government falls',
            `A confidence vote has ended the administration. You limp out with ${projectedSeats} projected seats and a legacy score of ${this.gameState.legacyScore}.`,
            'error'
        );
    }

    resolveElection() {
        const projectedSeats = this.calculateProjectedSeats();
        const strongestRegion = this.getStrongestRegion();
        const weakestFaction = this.getWeakestFaction();
        const decisiveBattleground = this.getDecisiveBattleground();
        const decisiveBloc = this.getDecisiveSwingBloc();
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
        this.gameState.lastTurnHighlights = [
            `Election outcome: ${outcome}.`,
            `Projected seats: ${projectedSeats}.`,
            decisiveBattleground
                ? `Map hinge: ${decisiveBattleground.region} ended at ${decisiveBattleground.support}% support with ${decisiveBattleground.seatEstimate} projected seats in play.`
                : `Best closing ground: ${strongestRegion.key} at ${Math.round(strongestRegion.support)} support.`,
            decisiveBloc
                ? `Decisive swing bloc: ${decisiveBloc.label} closed at ${Math.round(decisiveBloc.support)}%.`
                : `Best closing ground: ${strongestRegion.key} at ${Math.round(strongestRegion.support)} support.`,
            `Party fault line: ${weakestFaction.name} ended at ${Math.round(weakestFaction.support)} support.`,
            `Legacy score: ${this.gameState.legacyScore}.`,
            `Final map pressure centred on ${this.getIssueLabel(this.getTopPressureIssue().key).toLowerCase()}.`
        ];
        this.logLedgerEntry(
            'Election day',
            `${summary} You finish on ${projectedSeats} projected seats with a legacy score of ${this.gameState.legacyScore}.`,
            outcome === 'Defeat' ? 'error' : 'success'
        );
    }

    buildElectionResultNotes() {
        const topIssue = this.getTopPressureIssue();
        const weakestFaction = this.getWeakestFaction();
        const projectedSeats = this.gameState.electionResult?.projectedSeats ?? this.calculateProjectedSeats();
        const seatGap = projectedSeats - 326;
        const decisiveBloc = this.getDecisiveSwingBloc();
        const decisiveBattleground = this.getDecisiveBattleground();
        return [
            {
                tone: this.getElectionResultTone(),
                label: 'Campaign verdict',
                value: this.getElectionResultToneLabel(this.getElectionResultTone()),
                detail: `The dominant closing argument was ${this.getIssueLabel(topIssue.key).toLowerCase()}, which shaped how voters interpreted the rest of the record.`
            },
            {
                tone: seatGap >= 0 ? 'success' : seatGap >= -36 ? 'warning' : 'error',
                label: 'Seat math',
                value: `${projectedSeats} seats`,
                detail: seatGap >= 0
                    ? `You cleared the 326-seat line by ${seatGap}, which is why the result reads as governable rather than merely survivable.`
                    : `You finished ${Math.abs(seatGap)} short of a clean majority, so the campaign could not fully escape the politics of doubt.`
            },
            {
                tone: decisiveBattleground?.tone || 'info',
                label: 'Map hinge',
                value: decisiveBattleground?.region || 'Midlands',
                detail: decisiveBattleground
                    ? `${decisiveBattleground.support}% support translated into ${decisiveBattleground.seatEstimate} projected seats, making this the battleground where the verdict felt most live.`
                    : 'The electoral map stayed volatile enough that one battleground region still defined the emotional shape of the result.'
            },
            {
                tone: decisiveBloc ? (decisiveBloc.gap >= 0 ? 'success' : decisiveBloc.gap >= -2 ? 'warning' : 'error') : 'info',
                label: 'Decisive swing bloc',
                value: decisiveBloc ? `${decisiveBloc.label} ${Math.round(decisiveBloc.support)}%` : 'Floating voters',
                detail: decisiveBloc
                    ? (decisiveBloc.gap >= 0 ? decisiveBloc.successDetail : decisiveBloc.failureDetail)
                    : 'The broader swing electorate remained the final test of whether another term still felt politically safe.'
            },
            {
                tone: weakestFaction.support >= 54 ? 'info' : weakestFaction.support >= 40 ? 'warning' : 'error',
                label: 'Party fault line',
                value: weakestFaction.name,
                detail: `${Math.round(weakestFaction.support)} support. This bloc was the hardest to keep calm in the closing stretch.`
            }
        ];
    }

    getElectionResultTone() {
        const outcome = this.gameState.electionResult?.outcome;
        if (outcome === 'Majority Government') return 'success';
        if (outcome === 'Minority Government') return 'info';
        if (outcome === 'Hung Parliament') return 'warning';
        if (outcome === 'Defeat') return 'error';
        return 'info';
    }

    getElectionResultToneLabel(tone) {
        const labels = {
            success: 'Clear mandate',
            info: 'Governable, but narrow',
            warning: 'Unsettled verdict',
            error: 'Power lost'
        };
        return labels[tone] || 'Election verdict';
    }

    buildElectionResultScorecard() {
        const breakdown = this.getLegacyBreakdown(
            this.gameState.electionResult?.projectedSeats ?? this.calculateProjectedSeats()
        );
        const strongestRegion = this.getStrongestRegion();
        const weakestRegion = Object.entries(this.gameState.regionalSupport)
            .sort((a, b) => a[1] - b[1])[0];
        const weakestFaction = this.getWeakestFaction();
        const decisiveBattleground = this.getDecisiveBattleground();
        const partyManagementScore = this.clamp(
            weakestFaction.support * 0.55 + breakdown.authorityScore * 0.45,
            0,
            100
        );

        return [
            {
                label: 'Public services',
                value: `${breakdown.servicesScore}/100`,
                tone: this.getAgendaTone(breakdown.servicesScore),
                detail: `NHS waits closed at ${Math.round(this.gameState.performanceMetrics.nhsWaitingTimes)} weeks and schools ended at ${this.policyFormatters.schoolFunding(this.gameState.policies.schoolFunding)}.`
            },
            {
                label: 'Economy',
                value: `${breakdown.economyScore}/100`,
                tone: this.getAgendaTone(breakdown.economyScore),
                detail: `Growth ended at ${this.gameState.performanceMetrics.gdpGrowth.toFixed(1)}% with unemployment at ${this.gameState.performanceMetrics.unemployment.toFixed(1)}%.`
            },
            {
                label: 'Party management',
                value: `${Math.round(partyManagementScore)}/100`,
                tone: this.getAgendaTone(partyManagementScore),
                detail: `${weakestFaction.name} finished as the hardest bloc to hold together at ${Math.round(weakestFaction.support)} support.`
            },
            {
                label: 'Delivery machine',
                value: `${breakdown.deliveryScore}/100`,
                tone: this.getAgendaTone(breakdown.deliveryScore),
                detail: `${this.gameState.deliveredPolicies} delivered reform${this.gameState.deliveredPolicies === 1 ? '' : 's'} and ${this.gameState.implementationQueue.length} live implementation track${this.gameState.implementationQueue.length === 1 ? '' : 's'} reached election day.`
            },
            {
                label: 'Electoral map',
                value: `${breakdown.seatScore}/100`,
                tone: this.getAgendaTone(breakdown.seatScore),
                detail: decisiveBattleground
                    ? `${decisiveBattleground.region} was the hinge at ${decisiveBattleground.support}% support and ${decisiveBattleground.seatEstimate} projected seats, even though ${strongestRegion.key} still held best overall.`
                    : `${strongestRegion.key} held best at ${Math.round(strongestRegion.support)} support, while ${weakestRegion?.[0] || 'the weakest region'} never fully came back.`
            }
        ];
    }

    buildElectionResultChronicle() {
        const history = Array.isArray(this.gameState.electionLedger)
            ? this.gameState.electionLedger.slice(-4).reverse()
            : [];
        if (history.length) return history;
        return [
            {
                dateLabel: this.formatDateLabel(),
                title: 'Election night',
                detail: 'The campaign concluded without a stored chronicle, so this debrief is showing the final state only.',
                tone: 'info'
            }
        ];
    }

    updateDisplay() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const projectedSeats = this.calculateProjectedSeats();
        const scenario = this.scenarios[this.gameState.scenarioId];
        const campaignStory = this.gameState.campaignStory || this.buildCampaignStory();
        const topIssue = this.getTopPressureIssue();
        const weakestFaction = this.getWeakestFaction();

        document.getElementById('currentDate').textContent = `${months[this.gameState.currentDate.getMonth()]} ${this.gameState.currentDate.getFullYear()}`;
        document.getElementById('electionCountdown').textContent = `${this.calculateMonthsToElection()} months`;
        document.getElementById('approvalRating').textContent = `${this.gameState.approvalRating}%`;
        document.getElementById('politicalCapital').textContent = Math.round(this.gameState.politicalCapital);
        document.getElementById('emergencyStatus').textContent = this.gameState.emergencyPowers ? 'Active' : 'Inactive';
        document.getElementById('turnSummary').textContent = this.gameState.lastTurnSummary;
        document.getElementById('campaignPhase').textContent = campaignStory.phase;
        document.getElementById('campaignPhaseSummary').textContent = campaignStory.summary;
        document.getElementById('topPressureLabel').textContent = this.getIssueLabel(topIssue.key);
        document.getElementById('topPressureSummary').textContent = `${Math.round(topIssue.score)} pressure. ${this.getPressureTone(topIssue.score) === 'error' ? 'Dominating coverage and forcing the agenda.' : this.getPressureTone(topIssue.score) === 'warning' ? 'Rising fast and shaping the next turn.' : 'Manageable for now, but still politically relevant.'}`;
        document.getElementById('partyRiskLabel').textContent = weakestFaction.name;
        document.getElementById('partyRiskSummary').textContent = `${Math.round(weakestFaction.support)} support. ${weakestFaction.description}`;
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
          this.updateTurnHighlightsDisplay();
          this.updateTutorialDisplay();
          this.updateCampaignStoryDisplay();
          this.updateCampaignCompassDisplay();
          this.updateCampaignTimelineDisplay();
          this.updateCampaignPrioritiesDisplay();
          this.updatePressureFrontsDisplay();
          this.updateBattlegroundDisplay();
          this.updateEventsDisplay();
          this.updateQueueDisplay();
          this.updateElectionLedgerDisplay();
          this.updateCabinetDisplay();
          this.updateFactionDisplay();
          this.updateElectionModal();
          this.updateEventModal();
          this.updateTitleScreen();
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

    updateTurnHighlightsDisplay() {
        const list = document.getElementById('turnHighlights');
        if (!list) return;
        list.innerHTML = (this.gameState.lastTurnHighlights || []).map((item) => `<li>${item}</li>`).join('');
    }

    updateTutorialDisplay() {
        const panel = document.getElementById('tutorialPanel');
        const list = document.getElementById('tutorialSteps');
        if (!panel || !list) return;
        const isDismissed = this.reviewMode
            ? this.reviewTutorialDismissed
            : localStorage.getItem(this.tutorialDismissedKey) === 'true';
        if (isDismissed) {
            panel.classList.add('hidden');
            return;
        }

        const steps = [
            {
                done: Boolean(this.gameState.tutorial?.adjustedPolicy),
                title: 'Queue at least one reform',
                body: 'Move a department slider so the cabinet has something visible to deliver.'
            },
            {
                done: this.gameState.turnNumber > 1,
                title: 'Advance a month',
                body: 'Read the briefing and monthly highlights after the turn resolves.'
            },
            {
                done: Boolean(this.gameState.tutorial?.openedBriefing || this.gameState.tutorial?.viewedRegion),
                title: 'Read the mood or inspect a region',
                body: 'Use the national mood panel or click a region node to understand where the risk is really sitting.'
            },
            {
                done: Boolean(this.gameState.tutorial?.resolvedEvent),
                title: 'Resolve a live crisis',
                body: 'A good demo run should make you weigh money, approval, and authority against one another.'
            }
        ];
        const completedCount = steps.filter((step) => step.done).length;
        const progress = Math.round((completedCount / steps.length) * 100);
        const progressLabel = document.getElementById('tutorialProgressLabel');
        const progressValue = document.getElementById('tutorialProgressValue');
        const progressBar = document.getElementById('tutorialProgressBar');
        const progressSummary = document.getElementById('tutorialProgressSummary');

        if (progressLabel) progressLabel.textContent = `Campaign basics ${completedCount}/${steps.length}`;
        if (progressValue) progressValue.textContent = `${progress}%`;
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (progressSummary) {
            if (completedCount === steps.length) {
                progressSummary.textContent = 'Core loop complete. From here the demo is about timing delivery, managing blocs, and reaching the next checkpoint in shape.';
            } else if (!steps[1].done) {
                progressSummary.textContent = 'Start with one visible reform, then advance a month so you can see how the campaign story reacts.';
            } else if (!steps[2].done) {
                progressSummary.textContent = 'Read the mood, inspect a region, and connect the map to the briefing before spending more capital.';
            } else {
                progressSummary.textContent = 'One live crisis decision will complete the core tutorial and show what the full campaign loop feels like.';
            }
        }

        list.innerHTML = steps.map((step, index) => `
            <article class="tutorial-step ${step.done ? 'tutorial-step--done' : ''}">
                <span class="tutorial-step__marker">${step.done ? 'OK' : index + 1}</span>
                <div>
                    <strong>${step.title}</strong>
                    <p>${step.body}</p>
                </div>
            </article>
        `).join('');
        panel.classList.remove('hidden');
    }

    updateCampaignStoryDisplay() {
        const story = this.gameState.campaignStory;
        if (!story) return;
        document.getElementById('storyKicker').textContent = story.kicker;
        document.getElementById('storyHeadline').textContent = story.headline;
        document.getElementById('storySummary').textContent = story.summary;
        document.getElementById('storyNotes').innerHTML = story.notes.map((note) => `<li>${note}</li>`).join('');
    }

    updateCampaignCompassDisplay() {
        const list = document.getElementById('campaignCompass');
        if (!list) return;
        list.innerHTML = (this.gameState.campaignCompass || []).map((item) => `
            <article class="campaign-compass-item">
                <strong>${item.label}: ${item.value}</strong>
                <p>${item.detail}</p>
            </article>
        `).join('');
    }

    updateCampaignTimelineDisplay() {
        const list = document.getElementById('campaignTimeline');
        if (!list) return;
        list.innerHTML = (this.gameState.campaignTimeline || []).map((item) => `
            <article class="campaign-timeline-item campaign-timeline-item--${item.status}">
                <span class="campaign-timeline-item__label">${item.label}</span>
                <strong>${item.title}</strong>
                <p>${item.detail}</p>
            </article>
        `).join('');
    }

    updateCampaignPrioritiesDisplay() {
        const list = document.getElementById('campaignPriorities');
        if (!list) return;
        list.innerHTML = (this.gameState.campaignPriorities || []).map((item) => `
            <article class="campaign-priority campaign-priority--${item.tone}">
                <div class="campaign-priority__head">
                    <span class="status status--${item.tone}">${item.label}</span>
                    <strong>${item.title}</strong>
                </div>
                <p>${item.detail}</p>
                <div class="campaign-priority__action">${item.action}</div>
            </article>
        `).join('');
    }

    updatePressureFrontsDisplay() {
        const list = document.getElementById('pressureFronts');
        if (!list) return;
        list.innerHTML = (this.gameState.pressureFronts || []).map((item) => `
            <article class="pressure-front pressure-front--${item.tone}">
                <div class="pressure-front__head">
                    <div>
                        <span class="status status--${item.tone}">${item.label}</span>
                        <strong>${item.title}</strong>
                    </div>
                    <span class="pressure-front__value">${item.value}</span>
                </div>
                <p>${item.detail}</p>
                <div class="pressure-front__action">${item.action}</div>
            </article>
        `).join('');
    }

    updateBattlegroundDisplay() {
        const list = document.getElementById('battlegroundList');
        if (!list) return;
        list.innerHTML = (this.gameState.battlegrounds || []).map((item) => `
            <article class="battleground-item battleground-item--${item.tone}">
                <div class="battleground-item__head">
                    <div>
                        <strong>${item.region}</strong>
                        <p>${item.support}% support</p>
                    </div>
                    <span class="status status--${item.tone}">${item.status}</span>
                </div>
                <div class="battleground-item__meta">
                    <span>${item.seatEstimate} projected seats</span>
                </div>
                <p>${item.detail}</p>
            </article>
        `).join('');
    }

    updateFactionDisplay() {
        const list = document.getElementById('factionList');
        if (!list) return;
        const weakestFaction = this.getWeakestFaction();
        list.innerHTML = Object.entries(this.gameState.factions || {}).map(([key, support]) => {
            const profile = this.factionProfiles[key];
            const tone = support >= 62 ? 'success' : support >= 48 ? 'info' : support >= 36 ? 'warning' : 'error';
            return `
                <article class="faction-item faction-item--${tone}">
                    <div class="faction-item__head">
                        <strong>${profile.name}</strong>
                        <span>${Math.round(support)}</span>
                    </div>
                    <div class="faction-item__bar"><span style="width:${Math.round(support)}%"></span></div>
                    <p>${profile.description}${weakestFaction.key === key ? ' This is the bloc most likely to wobble first.' : ''}</p>
                </article>
            `;
        }).join('');
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
            this.audio.lastElectionCueKey = null;
            return;
        }
        const tone = this.getElectionResultTone();
        const modalCard = document.getElementById('electionModalCard');
        document.getElementById('electionResultTitle').textContent = this.gameState.electionResult.outcome;
        document.getElementById('electionResultSummary').textContent = this.gameState.electionResult.summary;
        document.getElementById('electionResultSeats').textContent = `${this.gameState.electionResult.projectedSeats}`;
        document.getElementById('electionResultOutcome').textContent = this.gameState.electionResult.outcome;
        document.getElementById('electionResultLegacy').textContent = `${this.gameState.electionResult.legacyScore ?? this.gameState.legacyScore}`;
        document.getElementById('electionResultApproval').textContent = `${this.gameState.approvalRating}%`;
        document.getElementById('electionResultStability').textContent = `${this.gameState.governmentStability}%`;
        if (modalCard) {
            modalCard.dataset.resultTone = tone;
        }
        const toneChip = document.getElementById('electionResultTone');
        if (toneChip) {
            toneChip.className = `status status--${tone}`;
            toneChip.textContent = this.getElectionResultToneLabel(tone);
        }
        const toneLead = document.getElementById('electionResultToneLead');
        if (toneLead) {
            toneLead.className = `status status--${tone}`;
            toneLead.textContent = this.getElectionResultToneLabel(tone);
        }
        const leadSummary = document.getElementById('electionResultLeadSummary');
        if (leadSummary) {
            leadSummary.textContent = this.getElectionLeadSummary();
        }
        document.getElementById('electionResultSignals').innerHTML = this.buildElectionResultSignals().map((item) => `
            <article class="election-result-signal election-result-signal--${item.tone}">
                <span class="election-result-signal__label">${item.label}</span>
                <strong>${item.value}</strong>
                <p>${item.detail}</p>
            </article>
        `).join('');
        document.getElementById('electionResultScorecard').innerHTML = this.buildElectionResultScorecard().map((item) => `
            <article class="election-scorecard-item election-scorecard-item--${item.tone}">
                <div class="election-scorecard-item__meta">
                    <strong>${item.label}</strong>
                    <span class="status status--${item.tone}">${item.value}</span>
                </div>
                <p>${item.detail}</p>
            </article>
        `).join('');
        document.getElementById('electionResultChronicle').innerHTML = this.buildElectionResultChronicle().map((entry) => `
            <article class="result-chronicle-entry result-chronicle-entry--${entry.tone || 'info'}">
                <div class="result-chronicle-entry__meta">
                    <span class="ledger-date">${entry.dateLabel}</span>
                    <span class="status status--${entry.tone || 'info'}">${entry.title}</span>
                </div>
                <p>${entry.detail}</p>
            </article>
        `).join('');
        document.getElementById('electionResultNotes').innerHTML = this.buildElectionResultNotes().map((note) => `
            <div class="result-note result-note--${note.tone || 'info'}">
                <strong>${note.label}: ${note.value}</strong>
                <p>${note.detail}</p>
            </div>
        `).join('');
        const cueKey = `${this.gameState.electionResult.outcome}-${this.gameState.electionResult.projectedSeats}`;
        if (this.audio.lastElectionCueKey !== cueKey) {
            this.playSignalCue(
                tone === 'success'
                    ? 'election-success'
                    : tone === 'info'
                        ? 'election-info'
                        : tone === 'warning'
                            ? 'election-warning'
                            : 'election-error'
            );
            this.audio.lastElectionCueKey = cueKey;
        }
        modal.classList.remove('hidden');
    }

    updateEventModal() {
        const modal = document.getElementById('eventModal');
        if (!this.gameState.pendingEvent) {
            modal.classList.add('hidden');
            this.audio.lastEventCueId = null;
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
            const effectSummary = this.describeEffectSummary(choice.effects || {});
            button.innerHTML = `
                <div class="event-choice__head">
                    <strong>${choice.label}</strong>
                    <span>Cost: ${choice.cost} PC</span>
                </div>
                <p>${choice.summary}</p>
                <div class="event-choice__effects">${effectSummary.map((item) => `<span class="effect-chip">${item}</span>`).join('')}</div>
            `;
            button.addEventListener('click', () => this.resolveEventChoice(index));
            choiceList.appendChild(button);
        });
        if (this.audio.lastEventCueId !== event.id) {
            this.playSignalCue(
                event.scripted && this.calculateMonthsToElection() <= 3
                    ? 'milestone-run-in'
                    : event.scripted
                        ? 'milestone'
                        : 'news'
            );
            this.audio.lastEventCueId = event.id;
        }
        modal.classList.remove('hidden');
    }

    openEventModal() {
        this.updateEventModal();
    }

    showHelpModal() {
        this.gameState.tutorial.openedBriefing = true;
        document.getElementById('helpModal').classList.remove('hidden');
        this.updateTutorialDisplay();
    }

    hideHelpModal(markSeen = false) {
        document.getElementById('helpModal').classList.add('hidden');
        if (markSeen) localStorage.setItem(this.helpSeenKey, 'true');
    }

    openTitleScreen() {
        this.updateTitleScreen();
        document.getElementById('titleScreen').classList.remove('hidden');
    }

    closeTitleScreen() {
        document.getElementById('titleScreen').classList.add('hidden');
        if (this.settings.musicEnabled) {
            this.startMusic();
        }
    }

    continueGame() {
        this.unlockAudio();
        this.closeTitleScreen();
    }

    openScenarioModal(lockToFreshStart = false) {
        this.scenarioSelection = {
            scenarioId: this.gameState.scenarioId || this.defaultScenarioId,
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

    openOptionsModal() {
        this.syncOptionsControls();
        document.getElementById('optionsModal').classList.remove('hidden');
    }

    closeOptionsModal() {
        document.getElementById('optionsModal').classList.add('hidden');
    }

    confirmScenarioSelection() {
        this.startScenario(this.scenarioSelection.scenarioId, this.scenarioSelection.difficulty);
        this.closeScenarioModal();
    }

    startScenario(scenarioId, difficulty) {
        this.unlockAudio();
        this.audio.lastEventCueId = null;
        this.audio.lastElectionCueKey = null;
        this.gameState = this.createInitialState({ scenarioId, difficulty });
        this.scenarioSelection = { scenarioId, difficulty };
        this.refreshCampaignState();
        this.recordPollSnapshot();
        this.syncSliders();
        this.updatePolicyCosts();
        this.updateDisplay();
        this.saveGame(false);
        this.closeTitleScreen();
        this.playSignalCue('start');
        this.showMessage(`${this.scenarios[scenarioId].name} is now live on ${this.difficulties[difficulty].label}.`, 'info');
    }

    calculateMonthsToElection() {
        return Math.max(
            0,
            (this.gameState.electionDate.getFullYear() - this.gameState.currentDate.getFullYear()) * 12
            + (this.gameState.electionDate.getMonth() - this.gameState.currentDate.getMonth())
        );
    }

    ensurePolicyImpactSlots() {
        document.querySelectorAll('.policy-item').forEach((item) => {
            if (item.querySelector('.policy-impact')) return;
            const impact = document.createElement('div');
            impact.className = 'policy-impact';
            item.appendChild(impact);
        });
    }

    dismissTutorial() {
        if (this.reviewMode) this.reviewTutorialDismissed = true;
        else localStorage.setItem(this.tutorialDismissedKey, 'true');
        this.updateTutorialDisplay();
    }

    updateTitleScreen() {
        const featured = this.scenarios[this.defaultScenarioId] || this.scenarios[this.gameState.scenarioId];
        const currentTopIssue = this.getTopPressureIssue();
        const continueButton = document.getElementById('continueGameBtn');
        const saveSummary = document.getElementById('titleSaveSummary');
        if (!featured || !continueButton || !saveSummary) return;

        document.getElementById('titleScenarioDescription').textContent = featured.titleDescription || featured.description;
        document.getElementById('titleArcLength').textContent = `${this.getScenarioArcMonths(featured)} months`;
        document.getElementById('titleOutlook').textContent = this.getElectionOutlook();
        document.getElementById('titleTopRisk').textContent = this.getIssueLabel(currentTopIssue.key);

        continueButton.textContent = this.hasPersistedSave ? 'Continue Government' : 'Continue Featured Demo';
        saveSummary.textContent = this.hasPersistedSave
            ? `Saved government: ${this.gameState.scenarioName}, ${this.formatDateLabel()}, approval ${this.gameState.approvalRating}%, ${this.getElectionOutlook().toLowerCase()}.`
            : 'No saved government yet. Continue will open the featured demo campaign with the current defaults.';
    }

    getScenarioArcMonths(scenario) {
        return Math.max(
            0,
            (scenario.electionDate[0] - scenario.currentDate[0]) * 12
            + (scenario.electionDate[1] - scenario.currentDate[1])
        );
    }

    createDefaultSettings() {
        return {
            musicEnabled: true,
            sfxEnabled: true,
            reducedMotion: false,
            masterVolume: 0.55
        };
    }

    loadSettings() {
        const defaults = this.createDefaultSettings();
        try {
            const raw = localStorage.getItem(this.settingsKey);
            if (!raw) return defaults;
            const parsed = JSON.parse(raw);
            return { ...defaults, ...parsed };
        } catch {
            return defaults;
        }
    }

    saveSettings() {
        localStorage.setItem(this.settingsKey, JSON.stringify(this.settings));
    }

    syncOptionsControls() {
        document.getElementById('musicToggle').checked = Boolean(this.settings.musicEnabled);
        document.getElementById('sfxToggle').checked = Boolean(this.settings.sfxEnabled);
        document.getElementById('reducedMotionToggle').checked = Boolean(this.settings.reducedMotion);
        document.getElementById('masterVolumeSlider').value = Math.round(this.settings.masterVolume * 100);
    }

    applySettings() {
        document.body.dataset.reducedMotion = this.settings.reducedMotion ? 'true' : 'false';
        if (this.audio.master && this.audio.context) {
            this.audio.master.gain.setTargetAtTime(this.settings.masterVolume, this.audio.context.currentTime, 0.05);
        }
        if (!this.settings.musicEnabled) {
            this.stopMusic();
        }
    }

    updateSetting(key, value) {
        this.settings = { ...this.settings, [key]: value };
        this.applySettings();
        this.syncOptionsControls();
        this.saveSettings();
        if (key === 'musicEnabled' && value) {
            this.unlockAudio();
            this.startMusic();
        }
        if (key === 'musicEnabled' && !value) {
            this.stopMusic();
        }
    }

    unlockAudio() {
        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextCtor) return;

        if (!this.audio.context) {
            const context = new AudioContextCtor();
            const master = context.createGain();
            master.gain.value = this.settings.masterVolume;
            master.connect(context.destination);

            const musicGain = context.createGain();
            musicGain.gain.value = 0.08;
            musicGain.connect(master);

            this.audio.context = context;
            this.audio.master = master;
            this.audio.musicGain = musicGain;
        }

        if (this.audio.context.state === 'suspended') {
            this.audio.context.resume();
        }
    }

    startMusic() {
        if (!this.settings.musicEnabled) return;
        this.unlockAudio();
        if (!this.audio.context || this.audio.musicNodes.length) return;

        const context = this.audio.context;
        const filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 620;
        filter.Q.value = 0.7;
        filter.connect(this.audio.musicGain);

        const bedGain = context.createGain();
        bedGain.gain.value = 0.22;
        bedGain.connect(filter);

        const droneA = context.createOscillator();
        droneA.type = 'triangle';
        droneA.frequency.value = 130.81;
        droneA.connect(bedGain);

        const droneB = context.createOscillator();
        droneB.type = 'sine';
        droneB.frequency.value = 196;
        droneB.connect(bedGain);

        const droneC = context.createOscillator();
        droneC.type = 'sine';
        droneC.frequency.value = 261.63;
        const droneCGain = context.createGain();
        droneCGain.gain.value = 0.07;
        droneC.connect(droneCGain);
        droneCGain.connect(filter);

        droneA.start();
        droneB.start();
        droneC.start();

        this.audio.musicNodes = [droneA, droneB, droneC, filter, bedGain, droneCGain];
        this.audio.musicPulseTimer = window.setInterval(() => this.playMusicPulse(), 9000);
    }

    stopMusic() {
        if (this.audio.musicPulseTimer) {
            window.clearInterval(this.audio.musicPulseTimer);
            this.audio.musicPulseTimer = null;
        }
        this.audio.musicNodes.forEach((node) => {
            if (typeof node.stop === 'function') {
                try {
                    node.stop();
                } catch {}
            }
            if (typeof node.disconnect === 'function') {
                try {
                    node.disconnect();
                } catch {}
            }
        });
        this.audio.musicNodes = [];
    }

    playMusicPulse() {
        if (!this.audio.context || !this.settings.musicEnabled) return;
        const context = this.audio.context;
        const phaseKey = this.getCampaignPhaseKey();
        const hasLiveEvent = Boolean(this.gameState.pendingEvent);
        const pulseProfiles = {
            opening: { note: 392, accent: 523.25, peak: 0.018, decay: 1.3, type: 'sine' },
            delivery: { note: 369.99, accent: 493.88, peak: 0.02, decay: 1.2, type: 'sine' },
            holding: { note: 349.23, accent: 466.16, peak: 0.021, decay: 1.08, type: 'triangle' },
            'run-in': { note: 329.63, accent: 440, peak: 0.024, decay: 0.94, type: 'triangle' }
        };
        const profile = pulseProfiles[phaseKey] || pulseProfiles.opening;
        const tone = context.createOscillator();
        const gain = context.createGain();
        tone.type = profile.type;
        tone.frequency.value = profile.note;
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(profile.peak + (hasLiveEvent ? 0.006 : 0), context.currentTime + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + profile.decay);
        tone.connect(gain);
        gain.connect(this.audio.musicGain);
        tone.start();
        tone.stop(context.currentTime + profile.decay + 0.05);

        if (hasLiveEvent) {
            const accent = context.createOscillator();
            const accentGain = context.createGain();
            accent.type = 'sine';
            accent.frequency.setValueAtTime(profile.accent, context.currentTime + 0.06);
            accent.frequency.exponentialRampToValueAtTime(profile.accent * 0.92, context.currentTime + 0.42);
            accentGain.gain.setValueAtTime(0.0001, context.currentTime + 0.06);
            accentGain.gain.exponentialRampToValueAtTime(profile.peak * 0.36, context.currentTime + 0.12);
            accentGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.48);
            accent.connect(accentGain);
            accentGain.connect(this.audio.musicGain);
            accent.start(context.currentTime + 0.06);
            accent.stop(context.currentTime + 0.52);
        }
    }

    playSignalCue(kind = 'news') {
        if (!this.settings.sfxEnabled) return;
        this.unlockAudio();
        if (!this.audio.context || !this.audio.master) return;

        const context = this.audio.context;
        const presets = {
            start: { notes: [261.63, 329.63, 392], type: 'sine', length: 0.22, peak: 0.026 },
            news: { notes: [220, 277.18], type: 'triangle', length: 0.18, peak: 0.022 },
            milestone: { notes: [246.94, 329.63, 415.3], type: 'sine', length: 0.26, peak: 0.024 },
            'milestone-run-in': { notes: [220, 293.66, 369.99, 440], type: 'triangle', length: 0.3, peak: 0.026 },
            election: { notes: [196, 261.63, 329.63, 392], type: 'triangle', length: 0.34, peak: 0.028 },
            'election-success': { notes: [196, 261.63, 329.63, 392], type: 'triangle', length: 0.34, peak: 0.028 },
            'election-info': { notes: [174.61, 220, 293.66, 349.23], type: 'triangle', length: 0.34, peak: 0.026 },
            'election-warning': { notes: [174.61, 220, 261.63, 311.13], type: 'triangle', length: 0.32, peak: 0.024 },
            'election-error': { notes: [164.81, 196, 233.08], type: 'sawtooth', length: 0.3, peak: 0.022 }
        };
        const preset = presets[kind] || presets.news;

        preset.notes.forEach((note, index) => {
            const osc = context.createOscillator();
            const gain = context.createGain();
            const startTime = context.currentTime + index * 0.045;
            osc.type = preset.type;
            osc.frequency.setValueAtTime(note, startTime);
            osc.frequency.exponentialRampToValueAtTime(note * 0.96, startTime + preset.length);
            gain.gain.setValueAtTime(0.0001, startTime);
            gain.gain.exponentialRampToValueAtTime(preset.peak / (1 + index * 0.2), startTime + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, startTime + preset.length);
            osc.connect(gain);
            gain.connect(this.audio.master);
            osc.start(startTime);
            osc.stop(startTime + preset.length + 0.02);
        });
    }

    playUiCue(kind = 'press') {
        if (!this.settings.sfxEnabled || !this.audio.context) return;
        const context = this.audio.context;
        const osc = context.createOscillator();
        const gain = context.createGain();
        const freq = kind === 'success' ? 520 : kind === 'warning' ? 220 : 360;
        const decay = kind === 'success' ? 0.22 : 0.12;
        osc.type = kind === 'warning' ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.82, context.currentTime + decay);
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.028, context.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + decay);
        osc.connect(gain);
        gain.connect(this.audio.master);
        osc.start();
        osc.stop(context.currentTime + decay + 0.02);
    }

    saveGame(showToast) {
        if (this.reviewMode) {
            if (showToast) this.showMessage('Review mode keeps local saves untouched.', 'info');
            return;
        }
        const serialisable = {
            ...this.gameState,
            savedAt: new Date().toISOString(),
            currentDate: this.gameState.currentDate.toISOString(),
            electionDate: this.gameState.electionDate.toISOString()
        };
        localStorage.setItem(this.storageKey, JSON.stringify(serialisable));
        this.hasPersistedSave = true;
        this.updateTitleScreen();
        if (showToast) this.showMessage('Government progress saved locally.', 'success');
    }

    loadGame() {
        const raw = localStorage.getItem(this.storageKey)
            || this.legacyStorageKeys.map((key) => localStorage.getItem(key)).find(Boolean);
        this.hasPersistedSave = Boolean(raw);
        if (!raw) return;
        try {
            const parsed = JSON.parse(raw);
            const scenarioId = parsed.scenarioId || this.defaultScenarioId;
            const difficulty = parsed.difficulty || 'normal';
            const initial = this.createInitialState({ scenarioId, difficulty });
            this.gameState = {
                ...initial,
                ...parsed,
                version: 5,
                currentDate: parsed.currentDate ? new Date(parsed.currentDate) : initial.currentDate,
                electionDate: parsed.electionDate ? new Date(parsed.electionDate) : initial.electionDate,
                policies: { ...initial.policies, ...(parsed.policies || {}) },
                voterApproval: { ...initial.voterApproval, ...(parsed.voterApproval || {}) },
                regionalSupport: { ...initial.regionalSupport, ...(parsed.regionalSupport || {}) },
                performanceMetrics: { ...initial.performanceMetrics, ...(parsed.performanceMetrics || {}) },
                cabinet: this.normaliseCabinet(parsed.cabinet || parsed.cabinetLoyalty, initial.cabinet),
                factionMomentum: { ...initial.factionMomentum, ...(parsed.factionMomentum || {}) },
                factions: { ...initial.factions, ...(parsed.factions || {}) },
                tutorial: { ...initial.tutorial, ...(parsed.tutorial || {}) },
                pollHistory: Array.isArray(parsed.pollHistory) && parsed.pollHistory.length ? parsed.pollHistory : initial.pollHistory,
                electionLedger: Array.isArray(parsed.electionLedger) && parsed.electionLedger.length ? parsed.electionLedger : initial.electionLedger,
                scriptedMomentsSeen: Array.isArray(parsed.scriptedMomentsSeen) ? parsed.scriptedMomentsSeen : [],
                implementationQueue: Array.isArray(parsed.implementationQueue) ? parsed.implementationQueue : initial.implementationQueue,
                events: Array.isArray(parsed.events) && parsed.events.length ? parsed.events : initial.events,
                lastTurnHighlights: Array.isArray(parsed.lastTurnHighlights) && parsed.lastTurnHighlights.length
                    ? parsed.lastTurnHighlights
                    : initial.lastTurnHighlights,
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
        this.gameState.tutorial.viewedRegion = true;
        const support = Math.round(this.gameState.regionalSupport[region]);
        const projected = Math.round(this.calculateProjectedSeats() * (support / 100) * 0.1);
        this.showMessage(`${region}: ${support}% government support. Rough local seat strength: ${projected}.`, 'info');
        this.updateTutorialDisplay();
    }

    showMessage(message, type) {
        const toast = document.createElement('div');
        toast.className = `status status--${type}`;
        Object.assign(toast.style, {
            position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: '1300',
          padding: '12px 16px',
          borderRadius: '8px',
          maxWidth: '320px'
        });
        toast.textContent = message;
        document.body.appendChild(toast);
        this.playUiCue(type === 'error' ? 'warning' : type === 'success' ? 'success' : 'press');
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
