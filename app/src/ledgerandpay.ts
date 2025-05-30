/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/ledgerandpay.json`.
 */
export type Ledgerandpay = {
  "address": "4UUkEZrwe8PoseD6Ph7WuUHJJ1ob5P4WevNcpFZt2LTC",
  "metadata": {
    "name": "ledgerandpay",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "createGroup",
      "discriminator": [
        79,
        60,
        158,
        134,
        61,
        199,
        56,
        248
      ],
      "accounts": [
        {
          "name": "group",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  114,
                  111,
                  117,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "arg",
                "path": "uniqueSeed"
              }
            ]
          }
        },
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "uniqueSeed",
          "type": {
            "array": [
              "u8",
              16
            ]
          }
        },
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "description",
          "type": "string"
        }
      ]
    },
    {
      "name": "joinGroup",
      "discriminator": [
        121,
        56,
        199,
        19,
        250,
        70,
        44,
        184
      ],
      "accounts": [
        {
          "name": "group",
          "writable": true
        },
        {
          "name": "joiner",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "logExpense",
      "discriminator": [
        69,
        135,
        36,
        30,
        155,
        128,
        211,
        176
      ],
      "accounts": [
        {
          "name": "payer",
          "docs": [
            "The signer who is paying"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "group",
          "docs": [
            "Make sure this group PDA exists and matches"
          ]
        },
        {
          "name": "expense",
          "docs": [
            "Create a new `Expense` PDA; ensure `expense.group == group.key()`"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  120,
                  112,
                  101,
                  110,
                  115,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "group"
              },
              {
                "kind": "account",
                "path": "payer"
              },
              {
                "kind": "arg",
                "path": "description"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "participants",
          "type": {
            "vec": "pubkey"
          }
        },
        {
          "name": "description",
          "type": "string"
        }
      ]
    },
    {
      "name": "removeMember",
      "discriminator": [
        171,
        57,
        231,
        150,
        167,
        128,
        18,
        55
      ],
      "accounts": [
        {
          "name": "group",
          "writable": true
        },
        {
          "name": "creator",
          "signer": true,
          "relations": [
            "group"
          ]
        }
      ],
      "args": [
        {
          "name": "member",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "renameGroup",
      "discriminator": [
        74,
        217,
        246,
        134,
        59,
        19,
        116,
        149
      ],
      "accounts": [
        {
          "name": "group",
          "writable": true
        },
        {
          "name": "creator",
          "signer": true,
          "relations": [
            "group"
          ]
        }
      ],
      "args": [
        {
          "name": "newName",
          "type": "string"
        }
      ]
    },
    {
      "name": "settleExpense",
      "discriminator": [
        204,
        176,
        141,
        254,
        95,
        142,
        214,
        181
      ],
      "accounts": [
        {
          "name": "group",
          "writable": true,
          "relations": [
            "expense"
          ]
        },
        {
          "name": "expense",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  120,
                  112,
                  101,
                  110,
                  115,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "group"
              },
              {
                "kind": "account",
                "path": "expense.payer",
                "account": "expense"
              },
              {
                "kind": "account",
                "path": "expense.description",
                "account": "expense"
              }
            ]
          }
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "payerUsdc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "payer"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "payee"
        },
        {
          "name": "payeeUsdc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "payee"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "expense",
      "discriminator": [
        49,
        167,
        206,
        160,
        209,
        254,
        24,
        100
      ]
    },
    {
      "name": "groupAccount",
      "discriminator": [
        12,
        42,
        207,
        53,
        238,
        29,
        151,
        111
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "alreadySettled",
      "msg": "This expense has already been settled."
    },
    {
      "code": 6001,
      "name": "notParticipant",
      "msg": "You are not a participant in this expense."
    },
    {
      "code": 6002,
      "name": "invalidPayee",
      "msg": "Can only pay back the original expense payer."
    },
    {
      "code": 6003,
      "name": "mathError",
      "msg": "Error dividing amount across participants."
    }
  ],
  "types": [
    {
      "name": "expense",
      "docs": [
        "On‐chain `Expense` structure"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "group",
            "type": "pubkey"
          },
          {
            "name": "payer",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "participants",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "shares",
            "type": {
              "vec": "u64"
            }
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "settled",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "groupAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "uniqueSeed",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "groupName",
            "type": "string"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "participants",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
