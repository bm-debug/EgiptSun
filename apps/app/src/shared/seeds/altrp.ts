import { taxonomy } from "../schema";

export const altrpSeed = {
  __meta__: {
    name: 'Altrp Settings (Test Data)',
    versions: [
      {
        version: '1.0.0',
        description: 'Initial test settings for Altrp payment logic',
        created_at: '2025-11-21 12:00',
      },
    ],
  },

  /**
   * Test settings for payment and finance logic.
   *
   * These records are safe defaults for local development and demo environments.
   * They should NOT be used as-is in production.
   */
  settings: [
    {
      uuid: '11111111-1111-1111-1111-111111111111',
      attribute: 'finance.installment.minAmount',
      value: '3000',
      type: 'number',
      order: 10,
      data_in: {
        label: 'Minimum installment amount (RUB)',
        description: 'Lower bound for allowed installment applications amount in RUB.',
        unit: 'RUB',
      },
    },
    {
      uuid: '22222222-2222-2222-2222-222222222222',
      attribute: 'finance.installment.maxAmount',
      value: '300000',
      type: 'number',
      order: 20,
      data_in: {
        label: 'Maximum installment amount (RUB)',
        description: 'Upper bound for allowed installment applications amount in RUB.',
        unit: 'RUB',
      },
    },
    {
      uuid: '33333333-3333-3333-3333-333333333333',
      attribute: 'finance.installment.defaultTermMonths',
      value: '12',
      type: 'number',
      order: 30,
      data_in: {
        label: 'Default installment term (months)',
        description: 'Default number of months for generated payment schedule when not specified explicitly.',
        unit: 'months',
      },
    },
    {
      uuid: '44444444-4444-4444-4444-444444444444',
      attribute: 'finance.penalty.overdueGraceDays',
      value: '3',
      type: 'number',
      order: 40,
      data_in: {
        label: 'Grace period for overdue payments (days)',
        description:
          'Number of days after due date before a payment is considered fully overdue and triggers collection workflow.',
        unit: 'days',
      },
    },
    {
      uuid: '55555555-5555-5555-5555-555555555555',
      attribute: 'finance.penalty.dailyRatePercent',
      value: '0.1',
      type: 'number',
      order: 50,
      data_in: {
        label: 'Daily penalty rate for overdue payments (%)',
        description:
          'Daily penalty rate applied to overdue amount for internal calculations. Concrete Sharia-compliant model must be reviewed before production use.',
        unit: 'percent_per_day',
      },
    },
    {
      uuid: '66666666-6666-6666-6666-666666666666',
      attribute: 'notifications.payment.reminderEnabled',
      value: 'true',
      type: 'boolean',
      order: 60,
      data_in: {
        label: 'Enable payment reminders',
        description: 'Toggle for sending reminders before upcoming installment payments.',
      },
    },
    {
      uuid: '77777777-7777-7777-7777-777777777777',
      attribute: 'notifications.payment.reminderDaysBefore',
      value: '3',
      type: 'number',
      order: 70,
      data_in: {
        label: 'Days before due date to send reminder',
        description: 'How many days before payment due date a reminder notification should be sent.',
        unit: 'days',
      },
    },
    {
      uuid: '88888888-8888-8888-8888-888888888888',
      attribute: 'notifications.payment.channels',
      value: 'EMAIL,SMS',
      type: 'string',
      order: 80,
      data_in: {
        label: 'Payment reminder channels',
        description: 'Comma separated list of channels used for payment reminders (e.g. EMAIL, SMS, TELEGRAM).',
      },
    },{
      uuid: "a1b2c3d4-e5f6-4890-abcd-ef1234567890",
      attribute: "scoring.weights",
      value: "Scoring Weights",
      type: "json",
      order: 100,
      dataIn: {
          initialScore: 500,
          modifiers: {
              maritalStatus: {
                  married: 20,
                  divorced: -10,
              },
              income: {
                  high: {
                      threshold: 100000,
                      value: 30,
                  },
                  low: {
                      threshold: 40000,
                      value: -20,
                  },
              },
              creditHistory: {
                  negativeKeywords: ["просрочка", "долг", "не платил"],
                  value: -50,
              },
              guarantors: {
                  guarantor1: 25,
                  guarantor2: 15,
              },
          },
      },
  },
  // Scoring risk thresholds - пороговые значения риска
  {
      uuid: "b2c3d4e5-f6a7-4901-bcde-f23456789012",
      attribute: "scoring.thresholds",
      value: "Scoring Risk Thresholds",
      type: "json",
      order: 200,
      dataIn: {
          low: {
              min: 600,
              label: "Низкий риск",
          },
          medium: {
              min: 450,
              max: 599,
              label: "Средний риск",
          },
          high: {
              max: 449,
              label: "Высокий риск",
          },
      },
  },
  ],
  taxonomy: [
    {
      entity: "blog.category",
      name: "altrp",
      title: "altrp Blog Categor",
      sortOrder: 10,
    }
  ]
} as const


