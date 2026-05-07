import OpenAI from 'openai';

// Initialize OpenAI client (will be null if no key)
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Summarize conversation
export const summarizeConversation = async (messages) => {
  if (!openai) {
    return { success: false, error: 'OpenAI not configured' };
  }

  try {
    const messageText = messages
      .map(m => `${m.sender?.firstName || 'User'}: ${m.content}`)
      .join('\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes conversations between landlords and tenants. Provide a brief, professional summary highlighting key points, action items, and any unresolved issues.'
        },
        {
          role: 'user',
          content: `Please summarize this conversation:\n\n${messageText}`
        }
      ],
      max_tokens: 300
    });

    return {
      success: true,
      summary: completion.choices[0].message.content
    };
  } catch (error) {
    console.error('AI summarization error:', error);
    return { success: false, error: error.message };
  }
};

// Generate payment reminder message
export const generatePaymentReminder = async (tenantName, amount, dueDate, propertyName) => {
  if (!openai) {
    // Return default template if no AI
    return {
      success: true,
      message: `Hi ${tenantName}, this is a friendly reminder that your rent payment of $${amount} for ${propertyName} is due on ${dueDate}. Please ensure timely payment to avoid any late fees. Thank you!`
    };
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional property management assistant. Generate friendly but professional payment reminder messages. Keep them concise and polite.'
        },
        {
          role: 'user',
          content: `Generate a payment reminder for:
- Tenant: ${tenantName}
- Amount: $${amount}
- Due Date: ${dueDate}
- Property: ${propertyName}`
        }
      ],
      max_tokens: 150
    });

    return {
      success: true,
      message: completion.choices[0].message.content
    };
  } catch (error) {
    console.error('AI reminder generation error:', error);
    // Fallback to template
    return {
      success: true,
      message: `Hi ${tenantName}, this is a friendly reminder that your rent payment of $${amount} for ${propertyName} is due on ${dueDate}. Please ensure timely payment to avoid any late fees. Thank you!`
    };
  }
};

// Analyze maintenance request urgency
export const analyzeMaintenanceUrgency = async (title, description, category) => {
  if (!openai) {
    // Simple rule-based fallback
    const emergencyKeywords = ['flood', 'fire', 'gas leak', 'no heat', 'no water', 'broken pipe', 'electrical', 'smoke'];
    const isEmergency = emergencyKeywords.some(kw => 
      title.toLowerCase().includes(kw) || description.toLowerCase().includes(kw)
    );
    
    return {
      success: true,
      priority: isEmergency ? 'emergency' : 'medium',
      reasoning: isEmergency ? 'Contains emergency keywords' : 'Standard maintenance request'
    };
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a property maintenance expert. Analyze maintenance requests and determine their priority level.
Return a JSON object with:
- priority: "low", "medium", "high", or "emergency"
- reasoning: brief explanation

Emergency: Safety hazards, no water/heat, gas leaks, flooding
High: Major appliance failures, significant leaks, HVAC issues
Medium: Minor repairs, cosmetic issues, non-urgent appliance issues  
Low: Routine maintenance, minor cosmetic issues`
        },
        {
          role: 'user',
          content: `Analyze this maintenance request:
Title: ${title}
Category: ${category}
Description: ${description}`
        }
      ],
      max_tokens: 100,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(completion.choices[0].message.content);
    return {
      success: true,
      priority: result.priority,
      reasoning: result.reasoning
    };
  } catch (error) {
    console.error('AI maintenance analysis error:', error);
    return {
      success: true,
      priority: 'medium',
      reasoning: 'Default priority assigned'
    };
  }
};

// Generate lease summary
export const generateLeaseSummary = async (leaseData) => {
  if (!openai) {
    return {
      success: true,
      summary: `Lease for ${leaseData.propertyName} Unit ${leaseData.unitNumber}. Monthly rent: $${leaseData.monthlyRent}. Term: ${leaseData.startDate} to ${leaseData.endDate}.`
    };
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a property management assistant. Generate clear, concise lease summaries highlighting key terms and important dates.'
        },
        {
          role: 'user',
          content: `Generate a summary for this lease:
Property: ${leaseData.propertyName}
Unit: ${leaseData.unitNumber}
Tenant: ${leaseData.tenantName}
Start Date: ${leaseData.startDate}
End Date: ${leaseData.endDate}
Monthly Rent: $${leaseData.monthlyRent}
Security Deposit: $${leaseData.securityDeposit || 'N/A'}
Payment Due Day: ${leaseData.paymentDueDay}
Late Fee: $${leaseData.lateFeeAmount} after ${leaseData.lateFeeGracePeriod} days`
        }
      ],
      max_tokens: 200
    });

    return {
      success: true,
      summary: completion.choices[0].message.content
    };
  } catch (error) {
    console.error('AI lease summary error:', error);
    return {
      success: true,
      summary: `Lease for ${leaseData.propertyName} Unit ${leaseData.unitNumber}. Monthly rent: $${leaseData.monthlyRent}. Term: ${leaseData.startDate} to ${leaseData.endDate}.`
    };
  }
};

// Smart reply suggestions for messages
export const generateReplySuggestions = async (messageHistory, userRole) => {
  if (!openai) {
    const suggestions = userRole === 'landlord' 
      ? ['Thank you for letting me know.', 'I will look into this.', 'Can you provide more details?']
      : ['Thank you for your response.', 'When can I expect this to be resolved?', 'I appreciate your help.'];
    
    return { success: true, suggestions };
  }

  try {
    const recentMessages = messageHistory.slice(-5).map(m => 
      `${m.sender?.firstName || 'User'}: ${m.content}`
    ).join('\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are helping a ${userRole} respond to messages. Generate 3 brief, professional reply suggestions. Return as JSON array of strings.`
        },
        {
          role: 'user',
          content: `Recent conversation:\n${recentMessages}\n\nGenerate 3 reply suggestions.`
        }
      ],
      max_tokens: 150,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(completion.choices[0].message.content);
    return {
      success: true,
      suggestions: result.suggestions || result
    };
  } catch (error) {
    console.error('AI reply suggestions error:', error);
    const suggestions = userRole === 'landlord' 
      ? ['Thank you for letting me know.', 'I will look into this.', 'Can you provide more details?']
      : ['Thank you for your response.', 'When can I expect this to be resolved?', 'I appreciate your help.'];
    
    return { success: true, suggestions };
  }
};

export default {
  summarizeConversation,
  generatePaymentReminder,
  analyzeMaintenanceUrgency,
  generateLeaseSummary,
  generateReplySuggestions
};
