# Claude Sub-Agents for GPS Trip Tracker

This directory contains specialized Claude sub-agent configurations for the GPS Trip Tracker project. Sub-agents provide focused expertise for specific technical domains and can be invoked for specialized consulting and analysis.

## Available Sub-Agents

### 🔧 Technical Consultant
**Role**: Expert technical consultant for full-stack web development architecture and technology recommendations

**Use Cases**:
- Technology stack evaluation and recommendations
- High-level architecture design and review
- Performance optimization strategies
- Security assessment and best practices
- Scalability planning and growth strategies
- Risk assessment and mitigation planning

**Expertise Areas**:
- Modern web development (React, TypeScript, Node.js)
- Mobile-first and responsive design
- Real-time data processing and GPS/mapping technologies
- API design and microservices architecture
- Database design and optimization
- Cloud deployment and DevOps practices

## How to Use Sub-Agents

### Method 1: Direct Invocation via Task Tool
```typescript
// Example: Invoke Technical Consultant for architecture review
Task({
  subagent_type: "general-purpose",
  description: "Technical consultation",
  prompt: `You are acting as the Technical Consultant sub-agent for the GPS Trip Tracker project.

  Context: [Provide specific project context]
  Question: [Your specific technical question]

  Please respond using the structured format defined in the Technical Consultant configuration.`
})
```

### Method 2: Reference Configuration
1. Read the agent configuration from `agent-config.json`
2. Use the prompt template from `prompt-technical-consultant.txt`
3. Follow the structured output format defined in `technical-consultant.md`

## Configuration Files

### `agent-config.json`
Central configuration file containing all sub-agent definitions, capabilities, and metadata.

### `prompt-technical-consultant.txt`
Detailed prompt template for the Technical Consultant role, including context, responsibilities, and output format requirements.

### `technical-consultant.md`
Comprehensive documentation of the Technical Consultant role, responsibilities, and expected deliverables.

## Usage Examples

### Architecture Review
```
Context: We're considering adding real-time collaboration features to the GPS tracker
Question: What architecture changes would be needed and what technology stack would you recommend?
```

### Performance Optimization
```
Context: GPS tracking is consuming too much battery on mobile devices
Question: What optimization strategies would you recommend for reducing battery usage?
```

### Technology Evaluation
```
Context: We need to choose between different mapping libraries
Question: Compare Leaflet vs MapBox vs Google Maps for our GPS tracking use case
```

### Security Assessment
```
Context: We're planning to add user accounts and cloud sync
Question: What security measures should we implement for protecting user location data?
```

## Expected Output Format

All sub-agents follow a structured reporting format:

1. **Executive Summary** - Key recommendations overview
2. **Current State Analysis** - Strengths and improvement areas
3. **Technology Recommendations** - Specific tech stack suggestions with reasoning
4. **Architecture Recommendations** - System design and scalability guidance
5. **Implementation Roadmap** - Phased approach with priorities
6. **Risk Assessment** - Potential issues and mitigation strategies
7. **Next Steps** - Immediate action items and decisions needed

## Project Context for Sub-Agents

All sub-agents are pre-configured with knowledge of:

- **Current Tech Stack**: React 18 + TypeScript + Vite, shadcn/ui, Tailwind CSS, Leaflet
- **Project Features**: Real-time GPS tracking, trip management, route replay
- **Architecture Patterns**: Service layer, hook-based state management
- **Key Challenges**: Mobile optimization, real-time data, privacy compliance
- **Current Issues**: TypeScript errors, partial API implementation

## Best Practices

### When to Use Sub-Agents
- ✅ Major architectural decisions
- ✅ Technology stack evaluations
- ✅ Performance bottleneck analysis
- ✅ Security implementation planning
- ✅ Scalability assessment
- ✅ Complex technical problem solving

### When NOT to Use Sub-Agents
- ❌ Simple coding questions
- ❌ Basic debugging assistance
- ❌ Straightforward implementation tasks
- ❌ Quick clarifications

### Maximizing Value
1. **Provide Context**: Always include relevant project details and constraints
2. **Be Specific**: Ask focused questions rather than broad "what should I do?"
3. **Include Constraints**: Mention budget, timeline, team skills, and technical limitations
4. **Request Alternatives**: Ask for multiple options with trade-offs
5. **Follow Up**: Use recommendations to guide further technical decisions

## Adding New Sub-Agents

To add a new specialized sub-agent:

1. Create documentation file: `{agent-name}.md`
2. Create prompt template: `prompt-{agent-name}.txt`
3. Update `agent-config.json` with new agent definition
4. Update this README with usage examples
5. Test the sub-agent with sample scenarios

## Integration with Development Workflow

### Pre-Development Phase
- Use Technical Consultant for architecture planning
- Evaluate technology choices and constraints
- Plan implementation roadmap and milestones

### During Development
- Consult for complex technical decisions
- Get recommendations for performance optimization
- Review security implementations

### Post-Development
- Assess deployment strategies
- Plan monitoring and maintenance approaches
- Evaluate future enhancement possibilities

---

**Note**: Sub-agents are specialized consulting tools. They provide expert recommendations but should be combined with your project knowledge and constraints for final decision-making.