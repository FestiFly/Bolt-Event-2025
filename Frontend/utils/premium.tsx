export interface PremiumStatus {
  isActive: boolean;
  isPro: boolean;
  isPlus: boolean;
  plan?: string;
  expiresAt?: string;
}

export const checkPremiumStatus = (): PremiumStatus => {
  const defaultStatus = { isActive: false, isPro: false, isPlus: false };
  
  try {
    const userJson = localStorage.getItem('festifly_user');
    if (!userJson) return defaultStatus;
    
    const userData = JSON.parse(userJson);
    if (!userData.premium) return defaultStatus;
    
    const premium = userData.premium;
    
    // Check if premium has expired
    if (premium.expires_at) {
      const expiryDate = new Date(premium.expires_at);
      if (expiryDate < new Date()) {
        return defaultStatus; // Premium has expired
      }
    }
    
    return {
      isActive: premium.is_active || false,
      isPro: premium.is_pro || false,
      isPlus: premium.is_plus || false,
      plan: premium.plan,
      expiresAt: premium.expires_at
    };
    
  } catch (error) {
    console.error("Error checking premium status:", error);
    return defaultStatus;
  }
};

export const formatExpiryDate = (dateString?: string): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return 'Invalid Date';
  }
};