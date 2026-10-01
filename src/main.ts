import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

interface Recipe {
  cups: number;
  lemons: number;
  sugar: number;
  ice: number;
}

interface Inventory {
  cups: number;
  lemons: number;
  sugar: number;
  ice: number;
}

interface SupplyPrices {
  cupCost: number;
  lemonCost: number;
  sugarCost: number;
  iceCost: number;
}

type WeatherType = "Hot & Sunny" | "Warm & Clear" | "Cool & Cloudy" | "Rainy";

class LemonadeStand {
  private cash: number;
  private inventory: Inventory;
  private recipe: Recipe;
  private day: number;

  constructor(initialCash: number = 20.0) {
    this.cash = initialCash;
    this.day = 1;
    this.inventory = { cups: 0, lemons: 0, sugar: 0, ice: 0 };
    // Recipe per cup: 1 cup, 1 lemon, 2 sugar, 3 ice cubes
    this.recipe = { cups: 1, lemons: 1, sugar: 2, ice: 3 };
  }

  public getDay(): number {
    return this.day;
  }

  public getCash(): number {
    return this.cash;
  }

  public getInventory(): Inventory {
    return { ...this.inventory };
  }

  public canMakeCup(): boolean {
    return (
      this.inventory.cups >= this.recipe.cups &&
      this.inventory.lemons >= this.recipe.lemons &&
      this.inventory.sugar >= this.recipe.sugar &&
      this.inventory.ice >= this.recipe.ice
    );
  }

  public sellCup(pricePerCup: number): boolean {
    if (!this.canMakeCup()) {
      return false;
    }
    this.inventory.cups -= this.recipe.cups;
    this.inventory.lemons -= this.recipe.lemons;
    this.inventory.sugar -= this.recipe.sugar;
    this.inventory.ice -= this.recipe.ice;
    this.cash += pricePerCup;
    return true;
  }

  public buySupplies(
    amounts: Inventory,
    prices: SupplyPrices
  ): { success: boolean; cost: number; error?: string } {
    const totalCost =
      amounts.cups * prices.cupCost +
      amounts.lemons * prices.lemonCost +
      amounts.sugar * prices.sugarCost +
      amounts.ice * prices.iceCost;

    if (totalCost > this.cash) {
      return {
        success: false,
        cost: totalCost,
        error: `Insufficient funds. Needed $${totalCost.toFixed(2)}, but you only have $${this.cash.toFixed(2)}.`,
      };
    }

    this.cash -= totalCost;
    this.inventory.cups += amounts.cups;
    this.inventory.lemons += amounts.lemons;
    this.inventory.sugar += amounts.sugar;
    this.inventory.ice += amounts.ice;

    return { success: true, cost: totalCost };
  }

  public meltIce(): void {
    // Ice melts at the end of each day
    this.inventory.ice = 0;
  }

  public nextDay(): void {
    this.day += 1;
  }
}

class GameSimulation {
  private stand: LemonadeStand;
  private rl: readline.Interface;

  constructor() {
    this.stand = new LemonadeStand(20.0);
    this.rl = readline.createInterface({ input, output });
  }

  private getRandomWeather(): { weather: WeatherType; customerDemand: number } {
    const roll = Math.random();
    if (roll < 0.3) {
      return { weather: "Hot & Sunny", customerDemand: Math.floor(Math.random() * 15) + 30 };
    } else if (roll < 0.65) {
      return { weather: "Warm & Clear", customerDemand: Math.floor(Math.random() * 12) + 20 };
    } else if (roll < 0.85) {
      return { weather: "Cool & Cloudy", customerDemand: Math.floor(Math.random() * 10) + 10 };
    } else {
      return { weather: "Rainy", customerDemand: Math.floor(Math.random() * 5) + 2 };
    }
  }

  private async promptNumber(questionText: string): Promise<number> {
    while (true) {
      const answer = await this.rl.question(questionText);
      const parsed = parseInt(answer.trim(), 10);
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
      console.log("Please enter a valid non-negative whole number.");
    }
  }

  private async promptFloat(questionText: string): Promise<number> {
    while (true) {
      const answer = await this.rl.question(questionText);
      const parsed = parseFloat(answer.trim());
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
      console.log("Please enter a valid positive dollar amount.");
    }
  }

  public async start(): Promise<void> {
    console.log("==========================================");
    console.log("     WELCOME TO THE LEMONADE STAND        ");
    console.log("==========================================\n");

    const supplyPrices: SupplyPrices = {
      cupCost: 0.05,
      lemonCost: 0.2,
      sugarCost: 0.1,
      iceCost: 0.02,
    };

    while (this.stand.getCash() > 0.5) {
      console.log(`\n--- Day ${this.stand.getDay()} ---`);
      console.log(`Current Cash: $${this.stand.getCash().toFixed(2)}`);

      const inv = this.stand.getInventory();
      console.log(
        `Inventory: ${inv.cups} cups, ${inv.lemons} lemons, ${inv.sugar} sugar, ${inv.ice} ice cubes`
      );

      const forecast = this.getRandomWeather();
      console.log(`Today's Forecast: ${forecast.weather}`);
      console.log(
        `Supply Prices: Cups: $${supplyPrices.cupCost.toFixed(2)} | Lemons: $${supplyPrices.lemonCost.toFixed(2)} | Sugar: $${supplyPrices.sugarCost.toFixed(2)} | Ice: $${supplyPrices.iceCost.toFixed(2)}`
      );

      // Buy supplies
      let purchaseValid = false;
      while (!purchaseValid) {
        console.log("\nOrder supplies for today:");
        const cupsToBuy = await this.promptNumber("How many cups? ");
        const lemonsToBuy = await this.promptNumber("How many lemons? ");
        const sugarToBuy = await this.promptNumber("How many sugar cubes? ");
        const iceToBuy = await this.promptNumber("How many ice cubes? ");

        const result = this.stand.buySupplies(
          { cups: cupsToBuy, lemons: lemonsToBuy, sugar: sugarToBuy, ice: iceToBuy },
          supplyPrices
        );

        if (result.success) {
          console.log(`Purchased supplies for $${result.cost.toFixed(2)}.`);
          purchaseValid = true;
        } else {
          console.log(`Transaction failed: ${result.error}`);
          console.log("Please re-enter an order within your budget.");
        }
      }

      const pricePerCup = await this.promptFloat("\nWhat price will you charge per cup? ($) ");

      // Simulate sales
      let pricePenaltyFactor = 1.0;
      if (pricePerCup > 1.5) {
        pricePenaltyFactor = Math.max(0.2, 1.5 / pricePerCup);
      }
      const potentialCustomers = Math.round(forecast.customerDemand * pricePenaltyFactor);

      let cupsSold = 0;
      for (let i = 0; i < potentialCustomers; i++) {
        if (this.stand.sellCup(pricePerCup)) {
          cupsSold++;
        } else {
          break; // Ran out of supplies
        }
      }

      console.log("\n--- Day Summary ---");
      console.log(`Weather: ${forecast.weather}`);
      console.log(`Cups Sold: ${cupsSold} (Demand was: ${potentialCustomers})`);
      if (cupsSold < potentialCustomers) {
        console.log("You ran out of supplies before meeting customer demand!");
      }
      console.log(`Revenue: $${(cupsSold * pricePerCup).toFixed(2)}`);

      // Ice melts overnight
      this.stand.meltIce();
      console.log("Unused ice melted at the end of the day.");

      console.log(`Remaining Cash: $${this.stand.getCash().toFixed(2)}`);
      const updatedInv = this.stand.getInventory();
      console.log(
        `Remaining Supplies: ${updatedInv.cups} cups, ${updatedInv.lemons} lemons, ${updatedInv.sugar} sugar`
      );

      const continuePlay = await this.rl.question(
        "\nAdvance to next day? (y/n): "
      );
      if (continuePlay.trim().toLowerCase() !== "y") {
        console.log("Thanks for playing!");
        break;
      }

      this.stand.nextDay();
    }

    if (this.stand.getCash() <= 0.5) {
      console.log("\nYou have run out of money to buy supplies. Game over!");
    }

    this.rl.close();
  }
}

// Run simulation
const game = new GameSimulation();
game.start();