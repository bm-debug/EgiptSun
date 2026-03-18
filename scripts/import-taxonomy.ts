#!/usr/bin/env node

/**
 * Script to import taxonomy data from CSV-like format
 * Usage: bun run scripts/import-taxonomy.ts
 * 
 * This script imports directly to the D1 database using wrangler
 */

import { Database } from 'bun:sqlite'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Path to local D1 database (created by wrangler)
const dbPath = join(__dirname, '../apps/app/.wrangler/state/v3/d1/miniflare-D1DatabaseObject')

// Try to find the actual SQLite file using Bun's readdir
async function findDbFile(basePath: string): Promise<string | null> {
  try {
    // Use Bun's readdir to list directory entries
    const entries = await Array.fromAsync(Bun.readdir(basePath))
    
    for (const entry of entries) {
      if (typeof entry === 'string') {
        const fullPath = join(basePath, entry)
        
        // Check if it's a .sqlite file (not WAL or SHM)
        if (entry.endsWith('.sqlite') && 
            !entry.endsWith('.sqlite-wal') && 
            !entry.endsWith('.sqlite-shm')) {
          // Verify it's a file
          const stat = await Bun.file(fullPath).stat()
          if (stat.isFile()) {
            return fullPath
          }
        }
      }
    }
    
    // If not found in current directory, search subdirectories
    for (const entry of entries) {
      if (typeof entry === 'string') {
        const fullPath = join(basePath, entry)
        const stat = await Bun.file(fullPath).stat().catch(() => null)
        if (stat?.isDirectory()) {
          const found = await findDbFile(fullPath)
          if (found) return found
        }
      }
    }
  } catch (e: any) {
    // If directory doesn't exist or other error, try known filename
    const knownDbFile = join(basePath, '8747c68463ed40688f71745c142c21053eb3e5dd651e41fe261d6a1151a972b2.sqlite')
    const file = Bun.file(knownDbFile)
    if (await file.exists()) {
      return knownDbFile
    }
  }
  return null
}

const dbFilePath = await findDbFile(dbPath)

if (!dbFilePath) {
  console.error(`❌ Could not find D1 database file in ${dbPath}`)
  console.error(`   Make sure wrangler dev server has been run at least once:`)
  console.error(`   bun run dev:wrangler:app`)
  console.error(`   Then stop it and run this script.`)
  process.exit(1)
}

console.log(`📂 Using database: ${dbFilePath}`)

const TAXONOMY_DATA = `
Channel	EMAIL	Email	200		cfa7e470-d0f7-4040-b619-b45358399fcb
Channel	TELEGRAM	Telegram	300		4617b51a-28f5-4690-b92e-1c6d32fe8662
Channel	WHATSAPP	Whatsapp	400		06938620-7e98-4c69-8dca-8800bf502221
Channel	MATRIX	Matrix	500		e4136d8a-428d-478f-a9e8-9edad08b4be5
Channel	CHATGPT	ChatGPT	600		52eb4423-b95e-45aa-87ed-5ece53203902
Channel	WEBSITE	Webapp	700		474eada9-cdd5-405b-95a3-0549f114ead7
Channel	PUSH	Push	800		d8a0becb-c2f2-45d4-b4ff-a220120e6d28
Channel	SMS	SMS	900		19298e5a-ea0f-42bf-8014-c7246ffd0729
City	NOVI_SAD	Novi Sad	1000		aebde375-1bc0-4234-b43b-7f4bccc69f19
City	BEOGRAD	Beograd	1100		c0f69648-875a-4eb4-8912-f30c9028f944
City	MOSCOW	Moscow	1200		61e7fdf8-bdca-4e75-b8e8-addf43d61f78
Country	US	United States	1300		f5e37b1e-64fa-433c-979e-220aef8370c2
Country	RS	Serbia	1400		0cf4d04e-9ec7-4dc1-b393-77315fb0af1c
Country	RU	Russia	1500		2ca1516e-47c4-434c-9b14-f64a0f3e2caf
Content	DRAFT	🔴 Draft	1600		c5615581-fa85-4568-b5f2-2bff43cdd834
Content	ON_APPROVAL	🟡 On approval	1700		26c8a77f-970f-4b38-a15c-c84cd1c65a6b
Content	ACTIVE	🟢 Active	1800		37864994-b290-4b0b-8e96-1b508117aa0d
Content	CANCELLED	⚫ Cancelled	1900		b5ed182d-a783-40ad-b321-9a9a015e2383
Currency	USD	Dollar USA	2000		ebe0018b-6e1e-4858-b6e0-48a4987191ee
Currency	USDT	USDT	2100		0a0ecab5-b1bc-472f-a948-ce8f00b5e8b6
Currency	EUR	Euro	2200		168b2716-c8a9-42c4-a763-97a9e1e94fe8
Sex	MALE	Male	2300		c7a1b2d3-e4f5-4a6b-8c9d-0e1f2a3b4c5d
Sex	FEMALE	Female	2400		a0b9c8d7-f6e5-4b3a-9c8d-7e6f5a4b3c2e
Asset	INVOICE	Invoice	2500		1e4a0cb9-cdc8-4357-a60b-c9f6eb1eff95
Asset	RECEIPT	Receipt	2600		8ca53e91-a38e-49cb-a7ea-ef7f811ef2ee
Asset	AGREEMENT	Agreement	2700		02857ea8-ecf6-4407-bd8b-764fbbfeb39d
Asset	PROPOSAL	Proposal	2800		76451f8e-5258-4c1a-ad29-9dea737a4bb6
Asset	REPORT	Report	2900		915538a1-01c5-4d53-9e62-d5928547b0eb
Asset	PRESENTATION	Presentation	3000		0ecaf832-b8dc-455b-8209-b50267aa40b0
Asset	CERTIFICATE	Certificate	3100		f529946d-8cf6-455d-a999-5a517a0de71c
Asset	ACCOUNT	Account	3200		01ed6cf3-c700-4390-8f50-770fa19410a0
Asset	WEBSITE	Webapp	3300		8f3a3a0f-7b62-4571-921f-39c738a195a6
Base	RECEIVING	🟢 Receiving	3400		ea2d25ab-5450-484b-b4cb-4034a8028171
Base	SHIPPING	🔴 Shipping	3500		bb3f43aa-bacb-40bf-a2d6-2e04ed2eac18
Base	RESERVATION	🟡 Reservation	3600		bce3c196-95de-4ea4-ac0d-a635702a9964
Base	KITTING	🔵 Kitting	3700		a1ccca13-c4f3-4d4a-b02b-a51321f0ebaa
Base	WRITE_OFF	⚫ Write-off	3800		c90bb487-5b3a-49fc-89b0-714035dac103
Base Move	PACKING	🔵 Packing	3900		15757903-a420-4134-b5be-39438ff7af17
Base Move	FIRST_MILE	🔴 First Mile	4000		bbd094e4-8545-4dea-a848-d82e14b051fc
Base Move	MIDDLE_MILE	🟠 Middle Mile	4100		9de53369-bf46-465e-b878-aa713d9243a3
Base Move	LAST_MILE	🟡 Last Mile	4200		0b26cc62-ef07-46b7-9d88-ed95836388d5
Base Move	DELIVERY	🟢 Delivery	4300		bcec9294-9af4-4660-996f-4686fc259486
Contractor	LOST	⚫ Lost	4400		56f1437b-cd76-4654-82cf-0393f959148e
Contractor	PROSPECT	🔵 Prospect	4500		bdb26295-c8ba-4ec6-b857-4584f9b92732
Contractor	LEAD	🔴 Lead	4600		39a42d75-c981-41fc-ba0e-91a07be751f7
Contractor	QUALIFIED	🟠 Qualified	4700		8cd8461e-8e9a-42c1-9c35-7edffa505a68
Contractor	NEW	🟡 New	4800		21c15f74-91cb-4d38-abd2-ecf6e6009fe4
Contractor	LOYAL	🟢 Loyal	4900		fe1b4516-3e66-4f80-a293-6d9a7a550329
Contractor	ADVOCATE	🟣 Advocate	5000		3eed21a2-2b97-4c73-8034-804050c374b5
Base Move Rout	PENDING	🔴 Pending	5100		d527e13d-7ebf-43a6-bc42-e0a3d87b4bd8
Base Move Rout	EN_ROUTE	🟠 En Route	5200		cdb26f94-2da2-428c-a535-dc3956ac0f13
Base Move Rout	ARRIVED	🟡 Arrived	5300		8bda9abe-2384-43aa-becd-691822973207
Base Move Rout	SUCCESSFUL	🟢 Successful	5400		f8267765-6d15-4acd-930f-22258a96983a
Base Move Rout	FAILED	⚫ Failed	5500		b7e86246-28e0-4c70-abc7-c710b00c5a6a
Base Move Rout	PARTIALLY	🔵 Partially 	5600		ed490207-d77f-4c8a-9a3e-3bb2dc249123
Deal	PITCHING	🔵 Pitching	5700		b397832b-c28d-4567-8e9e-3c40ff58355f
Deal	PROPOSAL	🔴 Proposal	5800		0a484aec-1d9a-4e2c-b4f4-8dac53a45384
Deal	ON_HOLD	🟠 On Hold	5900		1a7eb058-1496-41ca-964d-4ef4cb8d5abe
Deal	WIN	🟡 Win	6000		ebca34ea-74c8-423b-b6dd-9335ec7aed1f
Deal	IN_PROGRESS	🟢 In Progress	6100		621295a9-3956-4af0-97bd-1190ffad89b1
Deal	COMPLETED	🟣 Completed	6200		2f5d8b0c-861a-4ead-ade3-e1add41b6006
Deal	FAILURE	⚫ Failure	6300		cfca5ec9-c945-4318-b394-e75230bb573c
Employee Echelon	ACTIVE	🟢 Active 	6400		62d46ebf-268d-4131-85a1-56ecf34ecb9e
Employee Echelon	VACANT	🔴 Vacant 	6500		58776ccb-5386-4387-bc0d-324251ba42d1
Employee Echelon	TEMPORARY	🟡 Temporary 	6600		ce6f8e23-5713-4f65-9119-aa31b2339926
Employee Echelon	FROZEN	🔵 Frozen 	6700		0fa31333-7267-4a5d-b669-ed8b497f535d
Employee Echelon	ELIMINATED	⚫ Eliminated 	6800		72dae1ee-ef0e-4086-99aa-e5b7225bd898
Employee Echelon	UPCOMING	🟣 Upcoming 	6900		1c2666db-62c7-4259-87fe-b67e3a3d03e6
Employee	FULL_TIME	🟢 Full-time	7000		b5b8023b-8a0c-4e15-8602-a7b7e485e594
Employee	PART_TIME	🟡 Part-time	7100		7b409ab8-026b-4473-88c9-1595fd6d42f3
Employee	PROBATIONARY	🟠 Probationary	7200		b422af91-399f-4d1c-a089-e6af07197f88
Employee	INTERN	🔴 Intern 	7300		e4f3a4a9-6c6e-410d-8ed1-9094329618f9
Employee	ON_LEAVE	🟣 On Leave	7400		a42b9207-c44f-4181-9081-a54e5f9e083e
Employee	CONTRACTOR	🔵 Contractor 	7500		f048fcb2-2cd5-4d04-bab4-1ea2c5b53187
Employee	TERMINATED	⚫ Terminated	7600		2be8f65c-7204-4261-9774-1fe391f95ab0
Employee Leave	VACATION	Vacation	7700		8afaa66d-888c-45df-94cb-b7833fa00165
Employee Leave	SICK_LEAVE	Sick Leave	7800		222fe24c-930a-4fcb-8f36-ae7aebe38484
Employee Leave	DAY_OFF	Day Off	7900		465875cf-d978-4738-8f0a-c0640bbec128
Employee Leave	UNPAID_LEAVE	Unpaid Leave	8000		95c918d6-4d81-4d52-b607-062c4856c19d
Employee Leave	MATERNITY_PATERNITY_LEAVE	Maternity Paternuty Leave	8100		bdb42580-371b-4652-8d29-402b6ba9065b
Employee Leave	BEREAVEMENT_LEAVE	Bereavement Leave	8200		d0ab772a-affb-45ce-8eb1-c13bf3226baa
Employee Leave	CIVIC_DUTY_LEAVE	Civic Duty Leave	8300		d1767c9f-8c94-4989-adb2-705923215b52
Employee Leave	BUSINESS_TRIP	Business Trip	8400		42edf9b8-26e4-45c7-bf06-9d7f45534972
Employee Leave	TRAINING_LEAVE	Ntraining Leave	8500		db61a243-0b24-4514-9fc2-318122ba25a3
Employee Leave	REMOTE_WORK	Remote Work	8600		f19fbe34-8581-4c61-9302-6dc83bb4b797
Finance	DRAFT	🟣 Draft	8700		8302eb78-5554-4b8f-8c9b-e21b753855c3
Finance	SENT	🔵 Sent	8800		b1990be1-c414-4713-96e8-53214194eea4
Finance	PAID	🟢 Paid	8900		2e3252b7-a1ae-48c1-95fd-6d4702620784
Finance	PARTIALLY	🟡 Partially	9000		763d5974-31d7-4bed-b151-5e631570d328
Finance	OVERDUE	🔴 Overdue	9100		c6f4fc28-55df-440e-8608-2a3c98ec51b3
Finance	CANCELLED	⚫ Cancelled	9200		7a6d9c8b-0a60-4a22-92f0-69e2731a77ee
Goal	BACKLOG	🔵 Backlog	9300		b2207bf1-6598-4911-8d77-7b12fedf13c5
Goal	TO DO	🔴 To Do	9400		a277c2a1-dba9-42e1-a1d3-eeab48e3ed66
Goal	IN PROGRESS	🟠 In Progress	9500		6bbafc26-4fcf-497c-a453-fffded2071a4
Goal	IN REVIEW	🟡 In Review	9600		250a3e3c-4596-4951-b167-b63d5ce0474f
Goal	DONE	🟢 Done	9700		3bc90eef-2f15-4b82-9798-8361c9ad3325
Goal	CANCELLED	⚫ Cancelled	9800		4e5dca88-ee72-458d-a92c-89328cca15f5
Human	LOST	⚫ Lost	9900		7678c6c1-197a-4c71-9429-c494dfdbf0ce
Human	PROSPECT	🔵 Prospect	10000		34f5d604-da8c-4142-b514-53ba6765451c
Human	LEAD	🔴 Lead	10100		f56479ea-84dd-40cd-ae6d-dc561b9cd308
Human	QUALIFIED	🟠 Qualified	10200		0fb0cc34-95a8-44e0-bc1f-91c523a4740b
Human	NEW	🟡 New	10300		a0822b06-d6b5-43e4-8486-97f4a44759d8
Human	LOYAL	🟢 Loyal	10400		914a9042-7def-433a-b2ee-44f9d4dcf47a
Human	ADVOCATE	🟣 Advocate	10500		4b617559-59f7-4fd8-a3b8-58ca2291ca85
Journal Generation	WHISPER-LARGE-V3-TURBO	Whisper Large V3 Turbo	10600		59babb11-6fe3-421c-800f-9402599d6f6a
Journal Generation	GEMINI-25-PRO	Gemini 2.5 Pro	10700		b02c1b6e-fadf-45e6-a941-bfbfe037517c
Journal Generation	GEMINI-25-FLASH	Gemini 2.5 Falsh	10800		a368ed10-4a38-4b41-9c19-5c384137cb85
Journal Connection	FOLLOWS	🟡 Follows	10900		aa4bd2fc-43e4-42ef-8910-2fbdde6dda8d
Journal Connection	FRIENDSHIP	🟢 Friendship	11000		e8951702-f6bf-40df-9bd3-e01abe134c80
Journal Connection	BLOCKS	🔴 Blocks	11100		1a0e5d72-2a72-4860-9684-65ef733dec3e
Journal Connection	MANAGES	🔵 Manages	11200		36a45325-d635-43f9-8477-d2f9b7c6c842
Journal Connection	REFERRED_BY	🟣 Referred by	11300		dee7140b-902b-41b5-a0fd-eb7b7160a387
Location	AIRPORT	Airport	11400		c7a1fc59-35b8-445e-b870-365fc4fe4db5
Location	FACTORY	Factory	11500		a3196e7d-db9f-4807-86d1-ae953cc04e2a
Location	HOME	Home	11600		0e7d0b04-69ae-42ea-9f8e-1ac439010f12
Location	HOSPITAL	Hospital	11700		62c2eaa4-22cb-4943-96c5-0ddc198a3c81
Location	HOTEL	Hotel	11800		d0d6750e-6470-46af-8375-9da0293ac3fb
Location	OFFICE	Office	11900		e2e18e19-14b9-4f46-8905-c07ded27b654
Location	RESTAURANT	Restaurant	12000		53e2ce64-0b3c-4472-8c79-38f81afae8d9
Location	STATION	Station	12100		cc28f029-e563-4e2d-ac07-35103f30ebd1
Location	STORE	Store	12200		9bbda2cb-800d-48db-a0e0-8d4bef108dd9
Location	WAREHOUSE	Warehouse	12300		485f97c3-becf-4edf-9ae9-2e968ddc4a21
Message	DRAFT	🟡 Draft	12400		284f7bb2-47c7-4059-8150-e5c1e4bc7c7a
Message	SEND	🟢 Send	12500		15bb43f7-a7b8-4963-9539-81ad36fc9852
Message	EDITED	🔵 Edited	12600		7c2c5ee9-dcc7-442a-bf4d-98a679f008f5
Message	ARCHIEVED	🔴 Archieved	12700		91595dcf-f15c-4336-b7a5-998752dc1e4d
Message Thread	ACTIVE	🟢 Active 	12800		f401db0a-70f2-4171-9083-d586ee4a89b4
Message Thread	ARCHIEVED	🔴 Archieved	12900		a232b89e-12b7-42a3-b95b-982715420d8e
Message Thread	DELETED	⚫ Deleted	13000		a49bb6b9-4b21-4fe0-859f-aff01a6d0d63
Notice	INFO	🔵 Info	13100		1aaed147-7a3d-472f-babc-89cd9ca4a319
Notice	SUCCESS	🟢 Success	13200		7760e2f5-828a-4fcf-8cfa-90ba0326a86a
Notice	WARNING	🟡 Warning	13300		c243d774-0f54-4f03-822d-302cbcc030d0
Notice	DANGER	🔴 Danger	13400		1b16ad0e-1a7d-4755-9af8-ce4afb51a1c1
Notice	ERROR	⚫ Error	13500		4c1d72db-b00e-48e1-a5d0-926200493506
Outreach	BOGO 	Buy One, Get One Free	13600		c1a75d90-8e4f-4224-bc6a-f50e47107306
Outreach	BUNDLE 	Bundle	13700		ab1d1268-ac25-4e4e-b470-cf09f002d2e3
Outreach	CAMPAIGN 	Campaign	13800		c2593470-7956-4474-bd5d-e8fcd5ceacee
Outreach	COLD_OUTREACH	Cold outreach	13900		7d35aa5d-dc3f-4cef-b04a-4d54da986ec9
Outreach	CONTENT	Content	14000		32463495-8575-4ca7-a5be-40b9356bf792
Outreach	DISCOUNT	Discount	14100		fd4a528e-eef6-4ccb-810f-96fe73ea2ff5
Outreach	FREE_SHIPPING 	Free sheeping	14200		f68becef-511b-4dd1-a875-dbb79be201bc
Outreach	FUNNEL 	Funnel 	14300		40ee101c-c45d-463f-95a7-6e9049a5af31
Outreach	GIFT_CARD	Gift Card	14400		570e670b-86cf-4e07-88ff-fc8886310779
Outreach	GIFT_WITH_PURCHASE	Gift with purchase	14500		8fabd945-cbcf-462d-8c2d-96bb298416a3
Outreach	NEWSLETTER	Newsletter	14600		dab4ff6c-5132-47c5-b14d-222f04c9030b
Outreach	POINTS	Points program	14700		b2b55a32-008c-407d-a44c-de7545656ce3
Outreach	PROMOCODE	Promocode	14800		7371d795-97ff-40ff-8be8-091a25101ad3
Outreach	REFERRAL	Referral	14900		8413f751-1579-4f9f-81bc-52122b720f11
Outreach	TIERED	Tiered program	15000		94ef1de2-3fd4-4fa0-9a07-8c163bcd5230
Outreach	VIP_OFFER 	VIP offer	15100		7c277127-803c-4b67-a43a-a5c58d8c6003
Product	ARTS_AND_CRAFTS_SUPPLIES_PROD	Arts and Crafts Supplies	15200		322c2a2e-5cb8-4418-94b4-f4fe59fbf29b
Product	AUTOMOTIVE_PROD	Automotive	15300		a0a08084-8aab-448c-9395-a44d0ce15862
Product	BABY_AND_KIDS_PROD	Baby and Kids	15400		2378f502-4355-40e8-b5e3-4f30d66fa789
Product	BEAUTY_AND_HEALTH_PROD	Beauty and Health	15500		10b961e5-7a7e-4c40-8392-3dfd88a2cbd1
Product	BEDDING_AND_BATH_PROD	Bedding and Bath	15600		ffcd8432-88f4-4526-8569-a68f16d49882
Product	BOOKS_AND_STATIONERY_PROD	Books and Stationery	15700		368fb0cd-cb62-4e8c-a5ad-d2806a0dbb23
Product	CAMERAS_AND_OPTICS_PROD	Cameras and Optics	15800		304f3341-bcb1-4164-af72-ac01c613612e
Product	CLOTHING_AND_ACCESSORIES_PROD	Clothing and Accessories	15900		c49ff67d-0aeb-430d-a7f2-877a6a636a5a
Product	COMPUTERS_PROD	Computers	16000		f3225480-a707-4c80-9cc3-001593672838
Product	ELECTRONICS_PROD	Electronics	16100		3ae28512-795d-4095-88a2-e1ab4885d1c2
Product	FLOWER_PROD	Flower	16200		b2bf596f-28aa-48d6-866d-d12e3070ec24
Product	FURNITURE_PROD	Furniture	16300		a1a8a276-ae37-432c-b0cd-d6b0bfa105e2
Product	GIFTS_AND_SOUVENIRS_PROD	Gifts and Souvenirs	16400		c6eca48b-bc8d-474d-9e21-42029cef7697
Product	GROCERY_AND_GOURMET_FOOD_PROD	Grocery and Gourmet Food	16500		2521e3de-5d60-46a5-b124-a6baf6c82d00
Product	HEALTH_AND_PERSONAL_CARE_PROD	Health and Personal Care	16600		b442b4cb-b933-47f7-ac31-58f0c2c0a5eb
Product	HOME_AND_GARDEN_PROD	Home and Garden	16700		6b6927d7-a646-4fd5-bf12-f07340130b6d
Product	HOME_APPLIANCES_PROD	Home Appliances	16800		872b9acf-1fc1-4167-92da-d521c9786447
Product	JEWELRY_PROD	Jewelry	16900		00c55e3d-ba69-43cd-b3dd-55fe5a0c8709
Product	KITCHEN_AND_DINING_PROD	Kitchen and Dining	17000		5b530259-d891-47cb-b04d-1ca77f3d7de7
Product	LUGGAGE_AND_BAGS_PROD	Luggage and Bags	17100		1cdac898-d07b-4774-b88f-9181f2dacb27
Product	MOBILE_PHONES_AND_ACCESSORIES_PROD	Mobile Phones and Accessories	17200		1deca9cc-be32-44d5-adeb-a3f3f295fc1d
Product	MOVIES_PROD	Movies	17300		7d33455e-c81e-4566-9485-6ec30f4bf26b
Product	MUSIC_PROD	Music	17400		4c48e184-3407-4f28-9d69-510dc6ffeaa7
Product	OFFICE_SUPPLIES_PROD	Office Supplies	17500		3fe493be-c19b-4727-8866-83e702c26908
Product	OUTDOOR_LIVING_PROD	Outdoor Living	17600		679500e3-af5a-4b1b-8d6c-37100957458d
Product	PET_SUPPLIES_PROD	Pet Supplies	17700		a5eccd58-21a9-4b7d-86ec-e207684c6891
Product	SHOES_PROD	Shoes	17800		96f42a59-d717-4d13-8087-7f1bdf51f009
Product	SPORTS_AND_OUTDOORS_PROD	Sports and Outdoors	17900		6e390072-9767-4767-afa7-53ddc8fd1b07
Product	TOOLS_AND_HOME_IMPROVEMENT_PROD	Tools and Home Improvement	18000		6ccc1f09-aff6-40bd-a121-6efaa33f70af
Product	TOYS_PROD	Toys	18100		b1d5cd53-b90e-4093-a877-851835d024c5
Product	VIDEO_GAMES_AND_CONSOLES_PROD	Video Games and Consoles	18200		50275788-84fa-4d5a-9a34-b680a3339b55
Product	WATCHES_PROD	Watches	18300		d6b83391-5e37-4d81-951e-192dbee1bf72
Product	CORPORATE_EVENTS_PROD	Corporate Events	18400		b68523e3-5d30-4f20-97e0-55042cad4378
Product	CULTURAL_EVENTS_PROD	Cultural Events	18500		16cdae6e-da8d-4872-8c12-83a84f0ca296
Product	EDUCATIONAL_EVENTS_PROD	Educational Events	18600		4e520463-ee1b-4e3f-acc4-b0abf792b98e
Product	ENTERTAINMENT_EVENTS_PROD	Entertainment Events	18700		8bc649dd-1083-4e0c-8d2d-e97a157bdc15
Product	OTHER_EVENT_TYPES_PROD	Other Event Types	18800		e8352b03-9bce-47f7-a523-f27d1efa8b29
Product	SOCIAL_EVENTS_PROD	Social Events	18900		539d8495-4eca-4700-a721-c0453551c8bf
Product	SPORTING_EVENTS_PROD	Sporting Events	19000		81c7f490-01e2-47a6-92ee-f140f21905cb
Product	CONSULTING_SERVICES_PROD	Consulting Services	19100		8a7f0d29-ea79-4a85-b6d2-e1e9f9df8861
Product	FINANCIAL_SERVICES_PROD	Financial Services	19200		6e114a14-c30e-4869-8348-fe95bc9a5742
Product	FREIGHT_TRANSPORTATION_PROD	Freight Transportation	19300		46d0bd0a-03c0-4e82-820e-2d9f1b7d6fdb
Product	HR_SERVICES_PROD	HR Services	19400		c9eb36e8-9c29-4c93-bbd6-14d6eba00155
Product	IT_SERVICES_PROD	IT Services	19500		5a0ec2da-50f1-4fc6-943b-2cb244f0354b
Product	LEGAL_SERVICES_PROD	Legal Services	19600		6082e3b0-f399-4626-b694-56b28d045c93
Product	MARKETING_SERVICES_PROD	Marketing Services	19700		d5284b50-9967-4aee-aedb-a6187a96b3be
Product	MEDICAL_SERVICES_PROD	Medical Services	19800		1034785b-0aa6-4944-9724-f60a772376cf
Product	MAILINGS_PROD	Mailings	19900		cf223424-a034-47a7-931f-484d9a3fe3da
Product	WEB_DEVELOPMENT_PROD	Web Development	20000		dc4f21b1-e0c3-4bbf-a6b9-190c5175ee9f
Product	REAL_ESTATE_SERVICES_PROD	Real Estate Services	20100		9c992727-3756-4c65-ac98-376275cbd692
Product	OTHER_SERVICES_PROD	Other Services	20200		96158aaa-6670-483a-b9a5-2e6ef3d13ee2
Product	AI_PROD	AI	20300		fbd41ef8-11f9-40a7-adff-9037de4e33ba
Product	CRYPTOCURRENCIES_PROD	Cryptocurrencies	20400		5690241e-3f5e-455a-9548-7b44a6dca17a
Product	DIGITAL_GOODS_PROD	Digital Goods	20500		a0ad89cd-5205-456b-a682-c9e42a5203be
Product	SOFTWARE_PROD	Software	20600		323955c4-7a25-4ecd-8de6-d4b4c0037858
Text	ADS	Ads	20700		dff4ee3f-626f-4164-a28e-d1dccc6351a9
Text	ARTICLES	Articles	20800		5ba96714-bf9c-42b5-a64d-f5bee9b8c54b
Text	CASES	Cases	20900		24b4e36b-39b3-4ddb-a208-3284fa5f7917
Text	REVIEW	Review	21000		eb7aad2d-4051-4c53-b46c-99687f302287
Text	MODULES	Modules	21100		84e7041a-bdca-4f86-8228-4040fd8a956a
Text	FEATURES	Features	21200		9aafcbf5-774f-4ba1-af55-1db6bd1e9b27
Text	COMMENTS	Comments	21300		91a31a22-a61d-4b94-acb0-7e3a42d7fd86
Text	DOCS	Docs	21400		d06fc3e2-541b-4c65-9b58-de082e31654a
Text	EXERCISES	Exercises	21500		b4ef47b4-6bd9-4144-a205-c6b3acf4e647
Text	FAQ	FAQ	21600		36cf7acd-7c81-46f4-b353-0d47862be1d5
Text	GLOSSARY	Glossary	21700		789bf78e-0125-4013-b207-9d7681245a5d
Text	LEGAL	Legal	21800		b2e63a49-fd74-43d9-b599-062b582d55ef
Text	LESSONS	Lessons	21900		cde893d8-b2af-485d-9ecb-f6294bdd94f7
Text	NEWS	News	22000		3676de93-c99b-4d30-a3ee-c9622164945c
Text	NEWSLETTERS	Newsletters	22100		6ea58e38-d859-4c1d-b8d0-ae6e4e9a40d9
Text	RELEASES	Releases	22200		497d9f83-2767-49dd-a799-b035ae0abef8
Text	TEAM	Team	22300		5b713c43-ac4d-4fbe-ba20-38177ba73452
Text	TESTIMONIALS	Testimonials	22400		63f7ad5c-7c4f-4f8a-b095-0787fe389dab
Qualification	360_DEGREE_FEEDBACK	360-degree feedback	22500		408c92d2-d2ee-4125-bcfb-22b3dbc41b26
Qualification	ASSESSMENT_CENTER	Assessment Center	22600		3d123a4b-8110-4258-b9e5-41613fb3d9ce
Qualification	BEHAVIORAL_INTERVIEWS	Behavioral interviews	22700		1e929f94-5b50-47e8-8eb4-75aa8e65a69a
Qualification	CASE_STUDY	Case studies	22800		aaf4584a-9bf4-4db9-9e4f-eeca192dd8f1
Qualification	CUSTOMER_EVALUATION	Customer evaluation	22900		e0804a6f-4828-436d-9550-70041fee3aba
Qualification	DOCUMENT_ANALYSIS	Document analysis	23000		c027f021-add3-44d4-b8ad-4fa67049d2b4
Qualification	JOB_OBSERVATION	Job observation	23100		50bc7470-c452-484e-8955-7e7bb0b40ab3
Qualification	KNOWLEDGE_TESTING	Knowledge testing	23200		72d3d962-de66-40a3-8daf-db3d9577d22c
Qualification	KPI_ACHIEVEMENT_EVALUATION	KPI achievement evaluation	23300		dc4ba9af-4f8a-4a4e-ba1c-6b3745a2a409
Qualification	PEER_REVIEW	Peer review	23400		08b6f1f4-e235-4b37-8da0-94a19b84b02c
Qualification	PERFORMANCE_APPRAISAL	Performance appraisal	23500		b6fa5d31-49ef-4c39-9ef6-61e72fa20e95
Qualification	PERSONALITY_ASSESSMENTS	Personality assessments	23600		e90a7b83-a262-4814-832e-bf51faab20ee
Qualification	PORTFOLIO	Portfolio	23700		80ae91c8-91fa-4b6c-8898-bab641e30dd7
Qualification	PROJECTS_AND_ASSIGNMENTS	Projects and assignments	23800		06a99183-2c9e-4a59-a9b6-37f4e814b4ed
Qualification	PSYCHOMETRIC_TESTING	Psychometric testing	23900		9034c545-4542-414d-87ad-b02da4ee124e
Qualification	REFERENCES	References	24000		b7d59f3a-ffd8-43d7-aa49-90d51e4fbcc3
Qualification	SELF_ASSESSMENT	Self-assessment	24100		fa126196-5ab0-4824-8ffb-20eba8515664
Qualification	SITUATIONAL_JUDGMENT_TESTS	Situational judgment tests	24200		cebbec24-a9ce-4600-85a6-9708370cd9d0
Qualification	SKILLS_TESTING	Skills testing	24300		ca1ea75c-a6c7-485b-9663-de047a496204
Qualification	SUBORDINATE_EVALUATION	Subordinate evaluation	24400		7c1dbbe9-3a1f-4946-b57c-076cfd079a0f
Qualification	SUPERVISOR_EVALUATION	Supervisor evaluation	24500		98c68c3c-7063-455e-86e2-d5658d457aa3
Relation	DEAL_PRODUCT	Deal Product	24600		c6a0fcae-5fbe-4a49-8909-6e65e9540165
Relation	GALLERY	Gallery	24700		071ab9ae-346f-4463-87cc-5781ba366580
Relation	PRODUCT_VARIANT_ATTRIBUTES	Product Variant Attributes	24800		420963a6-a1d0-4764-aac7-ee5426761415
Segment	ACTIVE	🟢 Active 	24900		c3b90b4c-4875-4eef-a796-7241699828f8
Segment	ON_HOLD	🟡 On Hold	25000		efae1b6a-09e5-4ecd-9dd0-d8d6ad7e2726
Segment	COMPLETED 	🔴 Completed 	25100		dd51cc74-276e-4044-b54d-6f5ff4712a1d
Setting	BRAND	Brand	25200		ac62940e-40a8-4e02-b7d3-d1d70d8f7e67
Setting	CONTACT_INFO	Contact Info	25300		0a7b58a6-3548-4d10-a874-934c710991e9
Setting	TEMPLATE	Template	25400		b348d8ad-4ce4-416d-8ea9-5f01f70db33f
User Ban	ANY_HARMFUL_ACTIVITY	Any Harmful Activity	25500		7b409ab8-026b-4473-88c9-1595fd6d42f3
User Ban	BREAKING_RULES	Breaking Rules	25600		b422af91-399f-4d1c-a089-e6af07197f88
User Ban	BULLYING	Bullying	25700		e4f3a4a9-6c6e-410d-8ed1-9094329618f9
User Ban	CHEATING	Cheating	25800		a42b9207-c44f-4181-9081-a54e5f9e083e
User Ban	COPYRIGHT_INFRINGEMENT	Copyright Infringement	25900		f048fcb2-2cd5-4d04-bab4-1ea2c5b53187
User Ban	DISCRIMINATION	Discrimination	26000		2be8f65c-7204-4261-9774-1fe391f95ab0
User Ban	DISINFORMATION	Disinformation	26100		8afaa66d-888c-45df-94cb-b7833fa00165
User Ban	DISRUPTING_COMMUNITY	Disrupting Community	26200		222fe24c-930a-4fcb-8f36-ae7aebe38484
User Ban	EXCESSIVE_SELF_PROMOTION	Excessive Self-Promotion	26300		465875cf-d978-4738-8f0a-c0640bbec128
User Ban	EXPLOITING_VULNERABILITIES	Exploiting Vulnerabilities	26400		95c918d6-4d81-4d52-b607-062c4856c19d
User Ban	FINANCIAL_FRAUD	Financial Fraud	26500		bdb42580-371b-4652-8d29-402b6ba9065b
User Ban	HARASSMENT	Harassment	26600		d0ab772a-affb-45ce-8eb1-c13bf3226baa
User Ban	HATE_SPEECH	Hate Speech	26700		d1767c9f-8c94-4989-adb2-705923215b52
User Ban	IDENTITY_THEFT	Identity Theft	26800		42edf9b8-26e4-45c7-bf06-9d7f45534972
User Ban	ILLEGAL_ACTIVITIES	Illegal Activities	26900		db61a243-0b24-4514-9fc2-318122ba25a3
User Ban	PROMOTING_DANGEROUS_ACTIVITIES	Promoting Dangerous Activities	27000		f19fbe34-8581-4c61-9302-6dc83bb4b797
User Ban	PROMOTING_UNETHICAL_ACTIVITIES	Promoting Unethical Activities	27100		8302eb78-5554-4b8f-8c9b-e21b753855c3
User Ban	REPEATEDLY_BREAKING_RULES	Repeatedly Breaking Rules	27200		b1990be1-c414-4713-96e8-53214194eea4
User Ban	SHARING_EXPLICIT_CONTENT	Sharing Explicit Content	27300		2e3252b7-a1ae-48c1-95fd-6d4702620784
User Ban	SHARING_ILLEGAL_CONTENT	Sharing Illegal Content	27400		763d5974-31d7-4bed-b151-5e631570d328
User Ban	SHARING_PRIVATE_INFO	Sharing Private Info	27500		c6f4fc28-55df-440e-8608-2a3c98ec51b3
User Ban	SOCK_PUPPETING	Sock Puppeting	27600		7a6d9c8b-0a60-4a22-92f0-69e2731a77ee
User Ban	SPAMMING	Spamming	27700		b2207bf1-6598-4911-8d77-7b12fedf13c5
User Ban	TARGETED_ABUSE	Targeted Abuse	27800		a277c2a1-dba9-42e1-a1d3-eeab48e3ed66
User Ban	THREATS_OF_VIOLENCE	Threats of Violence	27900		6bbafc26-4fcf-497c-a453-fffded2071a4
User Ban	TROLLING	Trolling	28000		250a3e3c-4596-4951-b167-b63d5ce0474f
User Ban	USING_UNAUTHORIZED_SCRIPTS	Using Unauthorized Scripts	28100		3bc90eef-2f15-4b82-9798-8361c9ad3325
User Verification	EMAIL_VERIFICATION	Email verification	28200		f4b3c2d1-a098-4b6f-8c7d-6e5f4a3b2c1d
User Verification	PASSWORD_RESET	Password reset	28300		a1b9c8d7-e6f5-4a3b-9c8d-7e6f5a4b3c2e
User Verification	PHONE_VERIFICATION	Phone verification	28400		c3d2e1f0-b9a8-4c7d-8e6f-5a4b3c2d1e0f
Wallet Transaction	FAILED	⚫ Failed	28500		e09cf8c5-94a4-477d-9d15-11aadb000ce9
Wallet Transaction	REFUNDED	🟤 Refunded	28600		b1f3cf6a-8b28-41e3-9a27-d7c5ab2476ff
Wallet Transaction	CANCELLED PAYMENT	🔴 Cancelled	28700		f1484eab-dc2a-4c84-a94f-d7bfd4a961c1
Wallet Transaction	PENDING	🟡 Pending	28800		1efc1bc0-79ae-49cf-b4a9-355e44a305a4
Wallet Transaction	COMPLETED_PAYMENT	🟢 Completed	28900		09d6b900-f885-4d6f-9ad6-e692ce6ddadd
Wallet Transaction	PARTIALLY_PAID	🔵 Partially Paid	29000		33329c40-1aa7-4a23-b097-f59ac156ddf0
Zoo	DIED	⚫ Died	29100		1f2e3d4c-5b6a-4987-8654-3c2b1a098765
Zoo	LIVE	🟢 Live	29200		6a5b4c3d-2e1f-4987-b6a5-4c3d2e1f0987
`.trim()

// Map entity names to lowercase for Taxonomy.ts
const ENTITY_MAP: Record<string, string> = {
  'Channel': 'channel',
  'City': 'city',
  'Country': 'country',
  'Content': 'content',
  'Currency': 'currency',
  'Domain': 'domain',
  'Sex': 'sex',
  'Asset': 'asset',
  'Asset Variant': 'asset_variant',
  'Base': 'base',
  'Base Move': 'base_move',
  'Base Move Route': 'base_move_route',
  'Contractor': 'contractor',
  'Deal': 'deal',
  'Employee': 'employee',
  'Employee Echelon': 'employee_echelon',
  'Employee Timesheet': 'employee_timesheet',
  'Employee Leave': 'employee_leave',
  'Finance': 'finance',
  'Goal': 'goal',
  'Human': 'human',
  'Identity': 'identity',
  'Journal': 'journal',
  'Journal Connection': 'journal_connection',
  'Journal Generation': 'journal_generation',
  'Journal System': 'journal_system',
  'Key': 'key',
  'Location': 'location',
  'Message': 'message',
  'Message Thread': 'message_thread',
  'Media': 'media',
  'Notice': 'notice',
  'Outreach': 'outreach',
  'Outreach Referral': 'outreach_referral',
  'Product': 'product',
  'Product Variant': 'product_variant',
  'Permission': 'permission',
  'Qualification': 'qualification',
  'Relation': 'relation',
  'Role': 'role',
  'Role Permission': 'role_permission',
  'Segment': 'segment',
  'Setting': 'setting',
  'Text': 'text',
  'Text Variant': 'text_variant',
  'Taxonomy': 'taxonomy',
  'University': 'university',
  'User': 'user',
  'User Ban': 'user_ban',
  'User Session': 'user_session',
  'User Verification': 'user_verification',
  'Vote': 'vote',
  'Wallet': 'wallet',
  'Wallet Transaction': 'wallet_transaction',
  'Expanse': 'expanse',
  'Yield': 'yield',
  'Zoo': 'zoo',
}

// Translation map for titles (English -> Russian)
const TITLE_TRANSLATIONS: Record<string, string> = {
  // Channel
  'Email': 'Email',
  'Telegram': 'Telegram',
  'Whatsapp': 'Whatsapp',
  'Matrix': 'Matrix',
  'ChatGPT': 'ChatGPT',
  'Webapp': 'Веб-сайт',
  'Push': 'Push',
  'SMS': 'SMS',
  // City
  'Novi Sad': 'Нови-Сад',
  'Beograd': 'Белград',
  'Moscow': 'Москва',
  // Country
  'United States': 'Соединенные Штаты',
  'Serbia': 'Сербия',
  'Russia': 'Россия',
  // Content
  '🔴 Draft': '🔴 Черновик',
  '🟡 On approval': '🟡 На утверждении',
  '🟢 Active': '🟢 Активен',
  '⚫ Cancelled': '⚫ Отменен',
  // Currency
  'Dollar USA': 'Доллар США',
  'USDT': 'USDT',
  'Euro': 'Евро',
  // Sex
  'Male': 'Мужской',
  'Female': 'Женский',
  // Asset
  'Invoice': 'Счет',
  'Receipt': 'Чек',
  'Agreement': 'Соглашение',
  'Proposal': 'Предложение',
  'Report': 'Отчет',
  'Presentation': 'Презентация',
  'Certificate': 'Сертификат',
  'Account': 'Счет',
  // Base
  '🟢 Receiving': '🟢 Приемка',
  '🔴 Shipping': '🔴 Отправка',
  '🟡 Reservation': '🟡 Резервирование',
  '🔵 Kitting': '🔵 Комплектация',
  '⚫ Write-off': '⚫ Списание',
  // Base Move
  '🔵 Packing': '🔵 Упаковка',
  '🔴 First Mile': '🔴 Первая миля',
  '🟠 Middle Mile': '🟠 Средняя миля',
  '🟡 Last Mile': '🟡 Последняя миля',
  '🟢 Delivery': '🟢 Доставка',
  // Contractor / Human
  '⚫ Lost': '⚫ Потерян',
  '🔵 Prospect': '🔵 Потенциальный',
  '🔴 Lead': '🔴 Лид',
  '🟠 Qualified': '🟠 Квалифицирован',
  '🟡 New': '🟡 Новый',
  '🟢 Loyal': '🟢 Лояльный',
  '🟣 Advocate': '🟣 Адвокат',
  // Base Move Route
  '🔴 Pending': '🔴 В ожидании',
  '🟠 En Route': '🟠 В пути',
  '🟡 Arrived': '🟡 Прибыл',
  '🟢 Successful': '🟢 Успешно',
  '⚫ Failed': '⚫ Неудачно',
  '🔵 Partially ': '🔵 Частично',
  // Deal
  '🔵 Pitching': '🔵 Презентация',
  '🔴 Proposal': '🔴 Предложение',
  '🟠 On Hold': '🟠 На удержании',
  '🟡 Win': '🟡 Победа',
  '🟢 In Progress': '🟢 В процессе',
  '🟣 Completed': '🟣 Завершено',
  '⚫ Failure': '⚫ Провал',
  // Employee Echelon
  '🟢 Active ': '🟢 Активен',
  '🔴 Vacant ': '🔴 Вакантно',
  '🟡 Temporary ': '🟡 Временно',
  '🔵 Frozen ': '🔵 Заморожено',
  '⚫ Eliminated ': '⚫ Устранено',
  '🟣 Upcoming ': '🟣 Предстоящий',
  // Employee
  '🟢 Full-time': '🟢 Полная занятость',
  '🟡 Part-time': '🟡 Частичная занятость',
  '🟠 Probationary': '🟠 Испытательный срок',
  '🔴 Intern ': '🔴 Стажер',
  '🟣 On Leave': '🟣 В отпуске',
  '🔵 Contractor ': '🔵 Подрядчик',
  '⚫ Terminated': '⚫ Уволен',
  // Employee Leave
  'Vacation': 'Отпуск',
  'Sick Leave': 'Больничный',
  'Day Off': 'Выходной',
  'Unpaid Leave': 'Неоплачиваемый отпуск',
  'Maternity Paternuty Leave': 'Отпуск по уходу за ребенком',
  'Bereavement Leave': 'Отпуск по случаю смерти',
  'Civic Duty Leave': 'Отпуск по гражданским обязанностям',
  'Business Trip': 'Командировка',
  'Ntraining Leave': 'Отпуск на обучение',
  'Remote Work': 'Удаленная работа',
  // Finance
  '🟣 Draft': '🟣 Черновик',
  '🔵 Sent': '🔵 Отправлено',
  '🟢 Paid': '🟢 Оплачено',
  '🟡 Partially': '🟡 Частично',
  '🔴 Overdue': '🔴 Просрочено',
  // Goal
  '🔵 Backlog': '🔵 Бэклог',
  '🔴 To Do': '🔴 К выполнению',
  '🟠 In Progress': '🟠 В процессе',
  '🟡 In Review': '🟡 На проверке',
  '🟢 Done': '🟢 Выполнено',
  // Journal Generation
  'Whisper Large V3 Turbo': 'Whisper Large V3 Turbo',
  'Gemini 2.5 Pro': 'Gemini 2.5 Pro',
  'Gemini 2.5 Falsh': 'Gemini 2.5 Flash',
  // Journal Connection
  '🟡 Follows': '🟡 Следит',
  '🟢 Friendship': '🟢 Дружба',
  '🔴 Blocks': '🔴 Блокирует',
  '🔵 Manages': '🔵 Управляет',
  '🟣 Referred by': '🟣 Рекомендован',
  // Location
  'Airport': 'Аэропорт',
  'Factory': 'Завод',
  'Home': 'Дом',
  'Hospital': 'Больница',
  'Hotel': 'Отель',
  'Office': 'Офис',
  'Restaurant': 'Ресторан',
  'Station': 'Станция',
  'Store': 'Магазин',
  'Warehouse': 'Склад',
  // Message
  '🟡 Draft': '🟡 Черновик',
  '🟢 Send': '🟢 Отправлено',
  '🔵 Edited': '🔵 Отредактировано',
  '🔴 Archieved': '🔴 Архивировано',
  // Message Thread
  '🟢 Active ': '🟢 Активен',
  '🔴 Archieved': '🔴 Архивировано',
  '⚫ Deleted': '⚫ Удалено',
  // Notice
  '🔵 Info': '🔵 Информация',
  '🟢 Success': '🟢 Успех',
  '🟡 Warning': '🟡 Предупреждение',
  '🔴 Danger': '🔴 Опасность',
  '⚫ Error': '⚫ Ошибка',
  // Outreach
  'Buy One, Get One Free': 'Купи один, получи второй бесплатно',
  'Bundle': 'Набор',
  'Campaign': 'Кампания',
  'Cold outreach': 'Холодный контакт',
  'Content': 'Контент',
  'Discount': 'Скидка',
  'Free sheeping': 'Бесплатная доставка',
  'Funnel ': 'Воронка',
  'Gift Card': 'Подарочная карта',
  'Gift with purchase': 'Подарок при покупке',
  'Newsletter': 'Рассылка',
  'Points program': 'Программа лояльности',
  'Promocode': 'Промокод',
  'Referral': 'Реферальная программа',
  'Tiered program': 'Многоуровневая программа',
  'VIP offer': 'VIP предложение',
  // Product (too many to translate all, using key translations)
  'Arts and Crafts Supplies': 'Товары для творчества',
  'Automotive': 'Автомобильные товары',
  'Baby and Kids': 'Детские товары',
  'Beauty and Health': 'Красота и здоровье',
  'Bedding and Bath': 'Постельное белье и ванная',
  'Books and Stationery': 'Книги и канцелярия',
  'Cameras and Optics': 'Фотоаппараты и оптика',
  'Clothing and Accessories': 'Одежда и аксессуары',
  'Computers': 'Компьютеры',
  'Electronics': 'Электроника',
  'Flower': 'Цветы',
  'Furniture': 'Мебель',
  'Gifts and Souvenirs': 'Подарки и сувениры',
  'Grocery and Gourmet Food': 'Продукты и деликатесы',
  'Health and Personal Care': 'Здоровье и личная гигиена',
  'Home and Garden': 'Дом и сад',
  'Home Appliances': 'Бытовая техника',
  'Jewelry': 'Ювелирные изделия',
  'Kitchen and Dining': 'Кухня и столовая',
  'Luggage and Bags': 'Багаж и сумки',
  'Mobile Phones and Accessories': 'Мобильные телефоны и аксессуары',
  'Movies': 'Фильмы',
  'Music': 'Музыка',
  'Office Supplies': 'Офисные принадлежности',
  'Outdoor Living': 'Жизнь на открытом воздухе',
  'Pet Supplies': 'Товары для животных',
  'Shoes': 'Обувь',
  'Sports and Outdoors': 'Спорт и отдых',
  'Tools and Home Improvement': 'Инструменты и ремонт',
  'Toys': 'Игрушки',
  'Video Games and Consoles': 'Видеоигры и консоли',
  'Watches': 'Часы',
  'Corporate Events': 'Корпоративные мероприятия',
  'Cultural Events': 'Культурные мероприятия',
  'Educational Events': 'Образовательные мероприятия',
  'Entertainment Events': 'Развлекательные мероприятия',
  'Other Event Types': 'Другие типы мероприятий',
  'Social Events': 'Общественные мероприятия',
  'Sporting Events': 'Спортивные мероприятия',
  'Consulting Services': 'Консалтинговые услуги',
  'Financial Services': 'Финансовые услуги',
  'Freight Transportation': 'Грузовые перевозки',
  'HR Services': 'HR услуги',
  'IT Services': 'IT услуги',
  'Legal Services': 'Юридические услуги',
  'Marketing Services': 'Маркетинговые услуги',
  'Medical Services': 'Медицинские услуги',
  'Mailings': 'Рассылки',
  'Web Development': 'Веб-разработка',
  'Real Estate Services': 'Услуги недвижимости',
  'Other Services': 'Другие услуги',
  'AI': 'ИИ',
  'Cryptocurrencies': 'Криптовалюты',
  'Digital Goods': 'Цифровые товары',
  'Software': 'Программное обеспечение',
  // Text
  'Ads': 'Реклама',
  'Articles': 'Статьи',
  'Cases': 'Кейсы',
  'Review': 'Обзор',
  'Modules': 'Модули',
  'Features': 'Функции',
  'Comments': 'Комментарии',
  'Docs': 'Документация',
  'Exercises': 'Упражнения',
  'FAQ': 'Часто задаваемые вопросы',
  'Glossary': 'Глоссарий',
  'Legal': 'Юридические документы',
  'Lessons': 'Уроки',
  'News': 'Новости',
  'Newsletters': 'Рассылки',
  'Releases': 'Релизы',
  'Team': 'Команда',
  'Testimonials': 'Отзывы',
  // Qualification
  '360-degree feedback': '360-градусная обратная связь',
  'Assessment Center': 'Центр оценки',
  'Behavioral interviews': 'Поведенческие интервью',
  'Case studies': 'Кейсы',
  'Customer evaluation': 'Оценка клиента',
  'Document analysis': 'Анализ документов',
  'Job observation': 'Наблюдение на рабочем месте',
  'Knowledge testing': 'Тестирование знаний',
  'KPI achievement evaluation': 'Оценка достижения KPI',
  'Peer review': 'Оценка коллег',
  'Performance appraisal': 'Оценка производительности',
  'Personality assessments': 'Оценка личности',
  'Portfolio': 'Портфолио',
  'Projects and assignments': 'Проекты и задания',
  'Psychometric testing': 'Психодиагностическое тестирование',
  'References': 'Рекомендации',
  'Self-assessment': 'Самооценка',
  'Situational judgment tests': 'Тесты ситуационного суждения',
  'Skills testing': 'Тестирование навыков',
  'Subordinate evaluation': 'Оценка подчиненных',
  'Supervisor evaluation': 'Оценка руководителя',
  // Relation
  'Deal Product': 'Продукт сделки',
  'Gallery': 'Галерея',
  'Product Variant Attributes': 'Атрибуты варианта продукта',
  // Segment
  '🟢 Active ': '🟢 Активен',
  '🟡 On Hold': '🟡 На удержании',
  '🔴 Completed ': '🔴 Завершен',
  // Setting
  'Brand': 'Бренд',
  'Contact Info': 'Контактная информация',
  'Template': 'Шаблон',
  // User Ban
  'Any Harmful Activity': 'Любая вредоносная деятельность',
  'Breaking Rules': 'Нарушение правил',
  'Bullying': 'Запугивание',
  'Cheating': 'Обман',
  'Copyright Infringement': 'Нарушение авторских прав',
  'Discrimination': 'Дискриминация',
  'Disinformation': 'Дезинформация',
  'Disrupting Community': 'Нарушение сообщества',
  'Excessive Self-Promotion': 'Чрезмерная самореклама',
  'Exploiting Vulnerabilities': 'Использование уязвимостей',
  'Financial Fraud': 'Финансовое мошенничество',
  'Harassment': 'Домогательство',
  'Hate Speech': 'Речь ненависти',
  'Identity Theft': 'Кража личности',
  'Illegal Activities': 'Незаконная деятельность',
  'Promoting Dangerous Activities': 'Продвижение опасной деятельности',
  'Promoting Unethical Activities': 'Продвижение неэтичной деятельности',
  'Repeatedly Breaking Rules': 'Повторное нарушение правил',
  'Sharing Explicit Content': 'Обмен откровенным контентом',
  'Sharing Illegal Content': 'Обмен незаконным контентом',
  'Sharing Private Info': 'Обмен личной информацией',
  'Sock Puppeting': 'Поддельные аккаунты',
  'Spamming': 'Спам',
  'Targeted Abuse': 'Целевое злоупотребление',
  'Threats of Violence': 'Угрозы насилия',
  'Trolling': 'Троллинг',
  'Using Unauthorized Scripts': 'Использование несанкционированных скриптов',
  // User Verification
  'Email verification': 'Проверка email',
  'Password reset': 'Сброс пароля',
  'Phone verification': 'Проверка телефона',
  // Wallet Transaction
  '⚫ Failed': '⚫ Неудачно',
  '🟤 Refunded': '🟤 Возвращено',
  '🔴 Cancelled': '🔴 Отменено',
  '🟡 Pending': '🟡 В ожидании',
  '🟢 Completed': '🟢 Завершено',
  '🔵 Partially Paid': '🔵 Частично оплачено',
  // Zoo
  '⚫ Died': '⚫ Умер',
  '🟢 Live': '🟢 Жив',
}

interface TaxonomyRow {
  entity: string
  name: string
  title: { en: string; ru: string }
  sortOrder: number
  uuid: string
  dataIn?: string | null
  category?: { en: string; ru: string } | null
}

function generateUUID(): string {
  return crypto.randomUUID()
}

function parseData(data: string): TaxonomyRow[] {
  const lines = data.split('\n').filter(line => line.trim())
  const rows: TaxonomyRow[] = []

  for (const line of lines) {
    const parts = line.split('\t')
    if (parts.length < 5) continue

    const entity = parts[0].trim()
    const name = parts[1].trim()
    const titleStr = parts[2].trim() // Can be JSON or plain text
    const sortOrder = parseInt(parts[3].trim(), 10) || 0
    const dataIn = parts[4]?.trim() || ''
    const uuid = parts[5]?.trim() || ''

    // Convert entity to lowercase for Taxonomy.ts
    const entityLower = ENTITY_MAP[entity] || entity.toLowerCase().replace(/\s+/g, '_')
    
    // Parse title (can be JSON or plain text)
    let title: string | { en: string; ru: string } = titleStr
    try {
      // Try to parse as JSON
      const titleJson = JSON.parse(titleStr)
      if (typeof titleJson === 'object' && (titleJson.en || titleJson.ru)) {
        title = titleJson
      }
    } catch {
      // Not JSON, use as plain text and translate
      const titleRu = TITLE_TRANSLATIONS[titleStr] || titleStr
      title = { en: titleStr, ru: titleRu }
    }

    // Extract category from data_in if present
    let category: { en: string; ru: string } | null = null
    if (dataIn) {
      try {
        const dataInJson = JSON.parse(dataIn)
        if (dataInJson && typeof dataInJson === 'object' && dataInJson.category) {
          category = dataInJson.category
        }
      } catch {
        // data_in is not valid JSON, ignore
      }
    }

    rows.push({
      entity: entityLower,
      name,
      title: typeof title === 'string' ? { en: title, ru: title } : title,
      sortOrder,
      uuid,
      dataIn: dataIn || null,
      category,
    })
  }

  return rows
}

async function importTaxonomy() {
  console.log('Parsing taxonomy data...')
  const rows = parseData(TAXONOMY_DATA)
  console.log(`Found ${rows.length} records to import\n`)

  // Open database
  let db: Database
  try {
    db = new Database(dbFilePath)
  } catch (error) {
    console.error(`❌ Failed to open database at ${dbFilePath}`)
    console.error(`   Make sure wrangler dev server is running or database file exists`)
    console.error(`   Error: ${String(error)}`)
    process.exit(1)
  }

  const errors: string[] = []
  const successes: string[] = []

  // Get table schema to check which columns exist
  const pragma = db.prepare(`PRAGMA table_info(taxonomy)`).all() as Array<{
    cid: number
    name: string
    type: string
    notnull: number
    dflt_value: any
    pk: number
  }>
  
  const columns = pragma.map(col => col.name.toLowerCase())
  const hasUuid = columns.includes('uuid')
  const hasCreatedAt = columns.includes('created_at')
  const hasUpdatedAt = columns.includes('updated_at')
  const hasDataIn = columns.includes('data_in')
  const hasCategory = columns.includes('category')
  
  console.log(`📋 Table columns: ${columns.join(', ')}`)

  // Build INSERT statement dynamically based on available columns
  const insertFields: string[] = ['entity', 'name', 'title', 'sort_order']
  const insertPlaceholders: string[] = ['?', '?', '?', '?']
  const insertValues: any[] = []
  
  if (hasUuid) {
    insertFields.push('uuid')
    insertPlaceholders.push('?')
  }
  if (hasDataIn) {
    insertFields.push('data_in')
    insertPlaceholders.push('?')
  }
  if (hasCategory) {
    insertFields.push('category')
    insertPlaceholders.push('?')
  }
  if (hasCreatedAt) {
    insertFields.push('created_at')
    insertPlaceholders.push("datetime('now')")
  }
  if (hasUpdatedAt) {
    insertFields.push('updated_at')
    insertPlaceholders.push("datetime('now')")
  }

  const insertSql = `INSERT INTO taxonomy (${insertFields.join(', ')}) VALUES (${insertPlaceholders.join(', ')})`
  const insertStmt = db.prepare(insertSql)

  // Prepare update statement for sort_order
  const updateSortOrderStmt = db.prepare(`
    UPDATE taxonomy SET sort_order = ? WHERE id = ?
  `)

  // Begin transaction for better performance
  const insertTransaction = db.transaction((rows: TaxonomyRow[]) => {
    for (const row of rows) {
      try {
        // Build values array dynamically
        // Convert title to JSON string
        const titleJson = typeof row.title === 'object' 
          ? JSON.stringify(row.title) 
          : JSON.stringify({ en: row.title, ru: row.title })
        
        const values: any[] = [
          row.entity,
          row.name,
          titleJson,
          row.sortOrder || 0, // Use provided sort_order or 0
        ]
        
        // Add uuid if column exists
        if (hasUuid) {
          values.push(row.uuid || generateUUID())
        }
        
        // Add data_in if column exists and row has dataIn
        if (hasDataIn) {
          values.push(row.dataIn || null)
        }
        
        // Add category if column exists and row has category
        if (hasCategory) {
          const categoryJson = row.category ? JSON.stringify(row.category) : null
          values.push(categoryJson)
        }
        
        // Note: created_at and updated_at are handled in SQL as datetime('now')
        
        // Insert record
        const result = insertStmt.run(...values)

        const lastInsertId = result.lastInsertRowid

        // Auto-assign sort_order = id * 100 if it was 0 or empty
        if ((row.sortOrder === 0 || !row.sortOrder) && lastInsertId) {
          const autoSortOrder = Number(lastInsertId) * 100
          updateSortOrderStmt.run(autoSortOrder, lastInsertId)
        }
      } catch (error) {
        throw { row, error }
      }
    }
  })

  // Process in batches
  const BATCH_SIZE = 50
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    try {
      insertTransaction(batch)
      
      for (const row of batch) {
        successes.push(`${row.entity}/${row.name}`)
        console.log(`✅ [${i + batch.indexOf(row) + 1}/${rows.length}] ${row.entity}/${row.name} - Imported`)
      }
    } catch (error: any) {
      if (error.row) {
        errors.push(`${error.row.entity}/${error.row.name}: ${String(error.error)}`)
        console.error(`❌ [${i + batch.indexOf(error.row) + 1}/${rows.length}] ${error.row.entity}/${error.row.name}: ${String(error.error)}`)
      } else {
        // Process batch one by one if transaction fails
        for (const row of batch) {
          try {
            // Build values array dynamically
            const values: any[] = [
              row.entity,
              row.name,
              row.title,
              row.sortOrder || 0,
            ]
            
            // Add uuid if column exists
            if (hasUuid) {
              values.push(row.uuid || generateUUID())
            }
            
            const result = insertStmt.run(...values)

            const lastInsertId = result.lastInsertRowid
            if ((row.sortOrder === 0 || !row.sortOrder) && lastInsertId) {
              const autoSortOrder = Number(lastInsertId) * 100
              updateSortOrderStmt.run(autoSortOrder, lastInsertId)
            }

            successes.push(`${row.entity}/${row.name}`)
            console.log(`✅ [${i + batch.indexOf(row) + 1}/${rows.length}] ${row.entity}/${row.name} - Imported`)
          } catch (err: any) {
            errors.push(`${row.entity}/${row.name}: ${String(err)}`)
            console.error(`❌ [${i + batch.indexOf(row) + 1}/${rows.length}] ${row.entity}/${row.name}: ${String(err)}`)
          }
        }
      }
    }
  }

  db.close()

  console.log(`\n\n=== Summary ===`)
  console.log(`✅ Success: ${successes.length}`)
  console.log(`❌ Errors: ${errors.length}`)

  if (errors.length > 0) {
    console.log(`\n=== Errors ===`)
    errors.forEach(err => console.log(err))
  }
}

// Run the import
importTaxonomy().catch(console.error)

