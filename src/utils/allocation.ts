export interface AllocationPeriod {
  id: string;
  allocation_percent?: number;
  allocation_percentage?: number;
  percentage?: number;
  starts_on?: string;
  ends_on?: string;
}

interface AllocationRange {
  startsOn: string;
  endsOn: string;
  excludedAllocationId?: string;
}

interface DatedAllocation extends AllocationPeriod {
  starts_on: string;
  ends_on: string;
}

export function getAllocationPercentage(allocation: AllocationPeriod): number {
  return Number(
    allocation.allocation_percentage ??
    allocation.allocation_percent ??
    allocation.percentage ??
    0
  );
}

function hasDates(allocation: AllocationPeriod): allocation is DatedAllocation {
  return Boolean(allocation.starts_on && allocation.ends_on);
}

export function getPeakAllocationPercentage(
  allocations: AllocationPeriod[],
  range?: AllocationRange,
): number {
  if (range && (!range.startsOn || !range.endsOn || range.endsOn < range.startsOn)) return 0;

  const datedAllocations = allocations.filter(hasDates);
  const relevantAllocations = datedAllocations.filter((allocation) => {
    if (allocation.id === range?.excludedAllocationId) return false;
    if (!range) return true;
    return allocation.starts_on <= range.endsOn && allocation.ends_on >= range.startsOn;
  });
  const changeDates = new Set(relevantAllocations.map((allocation) => allocation.starts_on));
  if (range) changeDates.add(range.startsOn);

  return Math.max(0, ...Array.from(changeDates, (date) => (
    relevantAllocations.reduce((total, allocation) => {
      const isActive = allocation.starts_on <= date && allocation.ends_on >= date;
      return isActive ? total + getAllocationPercentage(allocation) : total;
    }, 0)
  )));
}
