import { X } from 'lucide-react';
import { useLanguage } from './LanguageContext';

export default function TermsAndPrivacyDialog({ isOpen, onClose }) {
  const { language } = useLanguage();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6"
        style={{
          backgroundColor: '#FFF',
          border: '5px solid #000',
          boxShadow: '12px 12px 0px #000'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 w-12 h-12 flex items-center justify-center"
          style={{
            backgroundColor: '#FF6B35',
            border: '4px solid #000',
            boxShadow: '5px 5px 0px #000'
          }}
        >
          <X className="w-7 h-7" strokeWidth={4} />
        </button>

        <div className="prose prose-sm max-w-none">
          <h1 className="text-3xl font-black uppercase mb-4">
            Terms and Privacy Policy for Adventurer Guild
          </h1>
          
          <p className="text-sm font-bold mb-4">Last updated: January 18, 2026</p>
          
          <p className="mb-4">
            Adventurer Guild ("we", "our", or "the App") respects your privacy and is committed to protecting your personal data. This Privacy Policy explains what information we collect, how it is used, and your rights regarding that information.
          </p>

          <h2 className="text-2xl font-black uppercase mt-6 mb-3">1. Information We Collect</h2>
          <p className="mb-3">We collect only the minimum information necessary for the App to function properly.</p>
          
          <h3 className="text-xl font-black mt-4 mb-2">a. Account Information</h3>
          <p className="mb-2">When you create an account, we may collect:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>A user identifier (such as email address or account ID)</li>
            <li>Authentication-related information required for login</li>
          </ul>

          <h3 className="text-xl font-black mt-4 mb-2">b. User-Created Content</h3>
          <p className="mb-2">We store data that you voluntarily create while using the App, including but not limited to:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Tasks, quests, or lists you create</li>
            <li>Completion status and timestamps</li>
            <li>Streak data, including current streak and longest streak, used to track consecutive task completion</li>
            <li>Daily task completion rates, stored as part of the user's personal logs and used solely to allow users to review and compare their own progress</li>
            <li>In-app item and inventory data, such as items obtained from task completion rewards (e.g. loot boxes) and items created through in-app combination or crafting features</li>
          </ul>
          <p className="mb-4">This data exists solely to allow you to access, manage, and progress within the App across sessions.</p>

          <h2 className="text-2xl font-black uppercase mt-6 mb-3">2. How We Use Your Information</h2>
          <p className="mb-2">Your information is used only for the following purposes:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>To authenticate your account and maintain login sessions</li>
            <li>To store and sync your personal data</li>
            <li>To ensure the App functions correctly</li>
          </ul>
          <p className="mb-4">At present, we do not use your data for advertising, profiling, or marketing purposes.</p>

          <h2 className="text-2xl font-black uppercase mt-6 mb-3">3. Data Storage and Processing</h2>
          <p className="mb-3">Adventurer Guild stores and processes user data strictly for gameplay and core functionality purposes. This includes:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Quest and task-related data, used to allow users to create, view, and complete quests and track their progress</li>
            <li>Streak data, used to track consecutive task completion</li>
            <li>Achievement progress, used to unlock in-app achievements</li>
            <li>Loot box interaction data, including the timestamp of each box opening and the resulting reward outcome, stored solely to ensure accurate reward delivery and prevent duplicate or missing rewards</li>
          </ul>
          <p className="mb-4">
            Certain loot-related progress indicators may be maintained as part of core gameplay logic. For example, a counter may be used to track consecutive loot box openings in order to guarantee a specific reward after a defined number of openings (such as granting a special item after 60 consecutive loot box openings). This data is used exclusively for in-app reward logic and is not used for analytics, profiling, or marketing purposes.
          </p>
          <p className="mb-4">
            An account is required to ensure that user progress, quest state, and earned rewards can be accurately recorded and restored across sessions.
          </p>
          <p className="mb-4">
            All user-created quest data is stored in an encoded format and protected using platform-level security measures. Quest content is not publicly accessible and is used solely to support core application features.
          </p>
          <p className="mb-4">
            Daily tasks are an exception to this encoding approach. To ensure fast loading times and a smooth user experience, daily task content is stored in plain text format, rather than encoded. This design choice is made solely for performance optimization and does not change how the data is used or shared. Daily task data remains private to the user and is subject to the same access controls and retention rules described in this policy.
          </p>
          <p className="mb-4">
            Adventurer Guild uses Base44 as a platform provider for authentication, database hosting, and application infrastructure. Base44 provides these services in accordance with its own platform policies and security practices.
          </p>

          <h2 className="text-2xl font-black uppercase mt-6 mb-3">4. Data Sharing</h2>
          <p className="mb-3">We do not sell, rent, or trade your personal data.</p>
          <p className="mb-2">Your data may be shared only with the following service providers, solely for the purpose of operating core application features:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Base44, which provides authentication, database hosting, and application infrastructure</li>
            <li>Third-party AI service providers (such as DeepSeek), which process user-provided content to enable features such as:
              <ul className="list-circle pl-6 mt-2">
                <li>Generating RPG-style task descriptions</li>
                <li>Breaking down long-term projects into daily schedules</li>
                <li>Generating contextual feedback or encouragement messages based on task content</li>
              </ul>
            </li>
          </ul>
          <p className="mb-4">
            Data shared with AI services is limited to user-provided content and is transmitted solely to enable the requested features.
          </p>
          <p className="mb-4">
            We do not permit third-party AI service providers to use user data for model training or for any purpose other than providing the requested functionality.
          </p>

          <h2 className="text-2xl font-black uppercase mt-6 mb-3">5. Data Retention</h2>
          <p className="mb-3">
            Adventurer Guild follows a data minimization approach. User data is retained only to the extent necessary to support core application functionality. Certain user data is automatically deleted based on predefined retention rules, regardless of whether an account remains active.
          </p>
          <p className="mb-2">Specifically:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Individual quests are automatically deleted after seven days</li>
            <li>User-selected daily tasks are deleted after seven days. The most recent version may be retained solely as a template to generate the next day's tasks.</li>
            <li>Long-term projects are automatically deleted two years after project completion</li>
            <li>Loot box opening records (including timestamps and outcomes, but not the rewards themselves) are automatically deleted after seven days</li>
          </ul>
          <p className="mb-4">
            User account information is retained only while the account exists. If you delete your account, any remaining associated personal data will be removed in accordance with these retention rules.
          </p>

          <h2 className="text-2xl font-black uppercase mt-6 mb-3">6. Your Rights</h2>
          <p className="mb-2">You have the right to:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Access the personal data associated with your account</li>
            <li>Request correction or deletion of your data</li>
            <li>Delete your account at any time</li>
          </ul>
          <p className="mb-4">All data access and deletion controls are provided directly within the App.</p>

          <h2 className="text-2xl font-black uppercase mt-6 mb-3">7. Children's Privacy</h2>
          <p className="mb-4">
            Adventurer Guild is not intended for children under the age of 13. We do not knowingly collect personal data from children.
          </p>

          <h2 className="text-2xl font-black uppercase mt-6 mb-3">8. Changes to This Privacy Policy</h2>
          <p className="mb-4">
            We may update this Privacy Policy from time to time. Any changes will be posted within the App or on the App's website, with an updated revision date.
          </p>

          <h2 className="text-2xl font-black uppercase mt-6 mb-3">9. Loot Box Probability Disclosure</h2>
          <p className="mb-3">
            Adventurer Guild includes optional loot box mechanics as part of its in-app reward system. Loot boxes do not require real-world currency and are earned through gameplay activities.
          </p>
          
          <h3 className="text-xl font-black mt-4 mb-2">Base Drop Rates</h3>
          <p className="mb-2">Each loot box contains one primary item, with the following rarity distribution:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Common items: 60%</li>
            <li>Rare items: 30%</li>
            <li>Epic items: 8%</li>
            <li>Legendary items: 2%</li>
          </ul>

          <h3 className="text-xl font-black mt-4 mb-2">Additional Rewards</h3>
          <p className="mb-2">In addition to the primary item, each loot box opening has a chance to grant bonus rewards:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Freeze Token: Each loot box has a 1% chance to grant an additional Freeze Token.</li>
          </ul>

          <h3 className="text-xl font-black mt-4 mb-2">Pity System (Guaranteed Reward Mechanism)</h3>
          <p className="mb-2">To ensure fairness and prevent extended streaks of unfavorable outcomes, Adventurer Guild includes a built-in pity system:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>For every 60 consecutive loot box openings, users are guaranteed to receive at least one Freeze Token.</li>
          </ul>
          <p className="mb-4">The pity counter resets once the guaranteed reward is granted.</p>
          <p className="mb-4">
            All loot box mechanics are designed solely for gameplay progression and enjoyment. Loot box outcomes are not influenced by user behavior, spending patterns, or personal data, and are not used for analytics, profiling, or marketing purposes.
          </p>

          <h2 className="text-2xl font-black uppercase mt-6 mb-3">10. Independent Developer Disclosure</h2>
          <p className="mb-4">
            Adventurer Guild is an independently developed application created and maintained by a single developer, and is not operated by a company or organization.
          </p>
          <p className="mb-4">
            As an independent project, feature updates, availability, and future development may change over time. While reasonable efforts are made to maintain the App and protect user data, the App is provided on an "as-is" basis.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 font-black uppercase"
          style={{
            backgroundColor: '#FFE66D',
            border: '4px solid #000',
            boxShadow: '5px 5px 0px #000'
          }}
        >
          {language === 'zh' ? '关闭' : 'Close'}
        </button>
      </div>
    </div>
  );
}