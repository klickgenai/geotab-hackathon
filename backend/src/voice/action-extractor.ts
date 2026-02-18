export interface ActionItem {
  type: string;
  title: string;
  description: string;
  data?: unknown;
  priority: "low" | "medium" | "high";
}

interface ToolCallInfo {
  toolName: string;
  args: Record<string, unknown>;
  result: unknown;
}

/**
 * Extract dashboard action items from tool call results.
 * Maps tool results to actionable UI cards for the FleetShield dashboard.
 */
export function extractActionItem(toolCall: ToolCallInfo): ActionItem | null {
  const { toolName, args, result } = toolCall;
  const res = result as Record<string, unknown> | null;
  if (!res) return null;

  switch (toolName) {
    case "getFleetOverview": {
      const totalDrivers = res.totalDrivers ?? res.total_drivers;
      const avgScore = res.averageScore ?? res.average_score ?? res.fleetScore ?? res.fleet_score;
      const highRiskCount = res.highRiskCount ?? res.high_risk_count;
      return {
        type: "highlight-score",
        title: "Fleet Overview",
        description: `Fleet of ${totalDrivers ?? "?"} drivers${avgScore ? `, average score: ${avgScore}` : ""}${highRiskCount ? `, ${highRiskCount} high-risk` : ""}`,
        data: res,
        priority: highRiskCount && (highRiskCount as number) > 3 ? "high" : "medium",
      };
    }

    case "getDriverRiskScore": {
      const driverId = args.driverId ?? args.driver_id;
      const score = res.riskScore ?? res.risk_score ?? res.score;
      const riskLevel = res.riskLevel ?? res.risk_level ?? res.level;
      const driverName = res.driverName ?? res.driver_name ?? driverId;

      let priority: "low" | "medium" | "high" = "low";
      if (riskLevel === "critical" || riskLevel === "high" || (typeof score === "number" && score >= 70)) {
        priority = "high";
      } else if (riskLevel === "medium" || (typeof score === "number" && score >= 40)) {
        priority = "medium";
      }

      return {
        type: "highlight-drivers",
        title: `Driver Risk: ${driverName}`,
        description: `Risk score: ${score ?? "?"}${riskLevel ? ` (${riskLevel})` : ""}`,
        data: res,
        priority,
      };
    }

    case "getFleetInsuranceScore": {
      const score = res.score ?? res.insuranceScore ?? res.insurance_score;
      const grade = res.grade ?? res.letterGrade ?? res.letter_grade;
      const premiumImpact = res.premiumImpact ?? res.premium_impact;

      let priority: "low" | "medium" | "high" = "medium";
      if (grade === "F" || grade === "D" || (typeof score === "number" && score < 40)) {
        priority = "high";
      } else if (grade === "A+" || grade === "A" || (typeof score === "number" && score >= 80)) {
        priority = "low";
      }

      return {
        type: "highlight-score",
        title: `Fleet Insurance Score: ${grade ?? score ?? "?"}`,
        description: `Insurability score: ${score ?? "?"}${premiumImpact ? `, premium impact: $${premiumImpact}` : ""}`,
        data: res,
        priority,
      };
    }

    case "getDriverWellness": {
      const driverId = args.driverId ?? args.driver_id;
      const driverName = res.driverName ?? res.driver_name ?? driverId;
      const burnoutRisk = res.burnoutRisk ?? res.burnout_risk ?? res.burnoutScore ?? res.burnout_score;
      const retentionRisk = res.retentionRisk ?? res.retention_risk;
      const wellnessScore = res.wellnessScore ?? res.wellness_score;

      let priority: "low" | "medium" | "high" = "low";
      if (burnoutRisk === "high" || burnoutRisk === "critical" || (typeof burnoutRisk === "number" && burnoutRisk >= 70)) {
        priority = "high";
      } else if (burnoutRisk === "medium" || (typeof burnoutRisk === "number" && burnoutRisk >= 40)) {
        priority = "medium";
      }

      return {
        type: "highlight-wellness",
        title: `Wellness: ${driverName}`,
        description: `${wellnessScore ? `Wellness score: ${wellnessScore}` : ""}${burnoutRisk ? `, burnout risk: ${burnoutRisk}` : ""}${retentionRisk ? `, retention risk: ${retentionRisk}` : ""}`.replace(/^, /, ""),
        data: res,
        priority,
      };
    }

    case "getSafetyEvents": {
      const events = (res.events as Array<Record<string, unknown>>) || [];
      const totalEvents = res.totalEvents ?? res.total_events ?? events.length;
      const criticalCount = events.filter((e) => e.severity === "critical" || e.severity === "high").length;

      return {
        type: "highlight-drivers",
        title: "Safety Events",
        description: `${totalEvents} safety event${totalEvents !== 1 ? "s" : ""}${criticalCount > 0 ? `, ${criticalCount} critical/high severity` : ""}`,
        data: res,
        priority: criticalCount > 0 ? "high" : "medium",
      };
    }

    case "getFinancialImpact": {
      const totalSavings = res.totalSavings ?? res.total_savings ?? res.potentialSavings ?? res.potential_savings;
      const annualImpact = res.annualImpact ?? res.annual_impact;
      const roi = res.roi ?? res.returnOnInvestment ?? res.return_on_investment;

      return {
        type: "highlight-financial",
        title: "Financial Impact",
        description: `${totalSavings ? `Potential savings: $${totalSavings}` : ""}${annualImpact ? `, annual impact: $${annualImpact}` : ""}${roi ? `, ROI: ${roi}%` : ""}`.replace(/^, /, ""),
        data: res,
        priority: totalSavings && (totalSavings as number) > 50000 ? "high" : "medium",
      };
    }

    case "getCoachingRecommendations": {
      const recommendations = (res.recommendations as Array<Record<string, unknown>>) || [];
      const highPriority = recommendations.filter((r) => r.priority === "high" || r.priority === "critical");

      return {
        type: "highlight-drivers",
        title: "Coaching Recommendations",
        description: `${recommendations.length} recommendation${recommendations.length !== 1 ? "s" : ""}${highPriority.length > 0 ? `, ${highPriority.length} high priority` : ""}`,
        data: res,
        priority: highPriority.length > 0 ? "high" : "medium",
      };
    }

    case "generateInsuranceReport": {
      const reportUrl = res.reportUrl ?? res.report_url ?? res.url;
      const filename = res.filename ?? res.fileName ?? res.file_name;

      return {
        type: "show-report",
        title: "Insurance Report Generated",
        description: `Report ready${filename ? `: ${filename}` : ""}`,
        data: { ...res, reportUrl, filename },
        priority: "medium",
      };
    }

    case "queryAceAnalytics": {
      return {
        type: "highlight-score",
        title: "Ace Analytics Result",
        description: typeof res.summary === "string" ? res.summary : "Analytics query completed",
        data: res,
        priority: "low",
      };
    }

    case "getFleetComparison": {
      const ranking = res.ranking ?? res.percentile;
      return {
        type: "highlight-score",
        title: "Fleet Comparison",
        description: ranking ? `Fleet ranks at ${ranking} percentile` : "Comparison data retrieved",
        data: res,
        priority: "medium",
      };
    }

    default:
      return null;
  }
}

/**
 * Extract dashboard actions from response text (fallback for non-tool responses).
 * Used to highlight relevant dashboard sections based on conversation content.
 */
export function extractTextActions(text: string): ActionItem[] {
  const actions: ActionItem[] = [];
  const lower = text.toLowerCase();

  if (lower.includes("insurance score") || lower.includes("insurability")) {
    actions.push({
      type: "highlight-score",
      title: "Insurance Score",
      description: "View the fleet insurance score",
      priority: "low",
    });
  }
  if (lower.includes("risk") && (lower.includes("driver") || lower.includes("marcus") || lower.includes("jake") || lower.includes("derek"))) {
    actions.push({
      type: "highlight-drivers",
      title: "Driver Risk",
      description: "View driver risk profiles",
      priority: "low",
    });
  }
  if (lower.includes("burnout") || lower.includes("wellness") || lower.includes("retention")) {
    actions.push({
      type: "highlight-wellness",
      title: "Wellness",
      description: "View driver wellness data",
      priority: "low",
    });
  }
  if (lower.includes("report") || lower.includes("pdf")) {
    actions.push({
      type: "show-report",
      title: "Report",
      description: "View generated report",
      priority: "low",
    });
  }
  if (lower.includes("saving") || lower.includes("financial") || lower.includes("roi")) {
    actions.push({
      type: "highlight-financial",
      title: "Financial Impact",
      description: "View financial analysis",
      priority: "low",
    });
  }

  return actions;
}
