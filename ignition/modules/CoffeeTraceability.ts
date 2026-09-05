import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CoffeeTraceabilityModule = buildModule("CoffeeTraceabilityModule", (m) => {
  const coffeeTraceability = m.contract("CoffeeTraceability");

  return { coffeeTraceability };
});

export default CoffeeTraceabilityModule;