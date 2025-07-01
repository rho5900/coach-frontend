import React, { useState } from 'react';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';
import { Redirect } from 'expo-router';
import { useRouter } from 'expo-router';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert } from 'react-native';
import { db } from '@/constants/firebaseConfig';
import { doc, getDoc, setDoc, updateDoc, addDoc, collection } from 'firebase/firestore';


type Message = {
  sender: 'coach' | 'athlete';
  message: string;
};

type Profile = {
  age: number;
  sport: string;
  anxiety_level: string;
  motivation_level: string;
  context: string;
};

export default function SimChatScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'chat' | 'evaluate'>('form');
  const [chat, setChat] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<string | null>(null);
  const [simulationId, setSimulationId] = useState<string | null>(null);

  const [profile, setProfile] = useState<Profile>({
    age: 16,
    sport: 'Soccer',
    anxiety_level: 'High',
    motivation_level: 'Low',
    context: 'Before Game',
  });

  const { user, role, loading: authLoading } = useAuth();

  if (authLoading) return null;
  if (role !== 'coach') return <Redirect href="/coach" />;

  const handleStart = async () => {
  const initialMessage = 'Hey, how are you feeling lately?';
  const firstChat = [{ sender: 'coach' as const, message: initialMessage }];

  setChat(firstChat);
  setStep('chat');
  setLoading(true);

  try {
    const res = await fetch('https://coach-backend-hnvv.onrender.com/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile,
        chat_history: firstChat,
      }),
    });

    const data = await res.json();
    const fullChat: Message[] = [
      ...firstChat,
      { sender: 'athlete' as const, message: data.athlete_response },
    ];

    setChat(fullChat);
    // ✅ Backend already saves to Firebase, so we don't need to save here
  } catch (err) {
    console.error(err);
  }

  setLoading(false);
};

  const sendMessage = async () => {
    if (!input.trim()) return;
    const updatedChat: Message[] = [
  ...chat,
  { sender: 'coach' as const, message: input },
];


    setChat(updatedChat);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('https://coach-backend-hnvv.onrender.com/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          chat_history: updatedChat,
        }),
      });

      const data = await res.json();
const finalChat: Message[] = [
  ...updatedChat,
  { sender: 'athlete' as const, message: data.athlete_response },
];
setChat(finalChat);
      

      if (!user) return;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const teamId = userDoc.data()?.teamId;


      await addDoc(collection(db, 'simulations'), {
        profile,
        chat_history: finalChat,
        athlete_response: data.athlete_response,
        teamId,
        timestamp: new Date(),
      });
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  const endConversationAndEvaluate = async () => {
  setStep('evaluate');
  setLoading(true);

  try {
    // 1. Send to backend for evaluation
    const res = await fetch('https://coach-backend-hnvv.onrender.com/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, chat_history: chat }),
    });

    const data = await res.json();
    setEvaluationResult(data.evaluation);

    // 2. Save simulation + evaluation to Firestore
    if (!user) return;

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const teamId = userDoc.data()?.teamId;

    await addDoc(collection(db, 'simulations'), {
      profile,
      chat_history: chat,
      evaluation: data.evaluation,
      teamId,
      timestamp: new Date(),
    });

    // 3. Extract score from LLM evaluation (e.g., "Score: 8.5")
    const scoreMatch = data.evaluation.match(/Score:\s*([\d.]+)/i);
const scoreValue = scoreMatch ? parseFloat(scoreMatch[1]) : null;
if (scoreValue !== null) {
  const statsRef = doc(db, 'coachStats', user.uid);
  const statsSnap = await getDoc(statsRef);

  if (statsSnap.exists()) {
    const stats = statsSnap.data();
    const newTotal = stats.totalScore + scoreValue;
    const newSessions = stats.totalSessions + 1;

    await updateDoc(statsRef, {
      totalScore: newTotal,
      totalSessions: newSessions,
      averageScore: newTotal / newSessions,
    });
  } else {
    await setDoc(statsRef, {
      name: userDoc.data()?.name || '',
      totalScore: scoreValue,
      totalSessions: 1,
      averageScore: scoreValue,
    });
  }
}

    // 4. Update coachStats leaderboard
    const statsRef = doc(db, 'coachStats', user.uid);
    const statsSnap = await getDoc(statsRef);

    if (statsSnap.exists()) {
      const stats = statsSnap.data();
      const newTotal = stats.totalScore + scoreValue;
      const newSessions = stats.totalSessions + 1;

      await updateDoc(statsRef, {
        totalScore: newTotal,
        totalSessions: newSessions,
        averageScore: newTotal / newSessions,
      });
    } else {
      await setDoc(statsRef, {
        name: userDoc.data()?.name || '',
        totalScore: scoreValue,
        totalSessions: 1,
        averageScore: scoreValue,
      });
    }
  } catch (err) {
    console.error('Evaluation failed or leaderboard update failed:', err);
    Alert.alert('Error', 'Evaluation or leaderboard update failed.');
  }

  setLoading(false);
};


  if (step === 'form') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Create Athlete Profile</Text>
        <TextInput
          placeholder="Age"
          keyboardType="numeric"
          value={profile.age.toString()}
          onChangeText={(val) => setProfile({ ...profile, age: parseInt(val) || 0 })}
          style={styles.input}
        />
        <Text>Sport:</Text>
        <Picker
          selectedValue={profile.sport}
          onValueChange={(val) => setProfile({ ...profile, sport: val })}
          style={styles.picker}
        >
          <Picker.Item label="Soccer" value="Soccer" />
          <Picker.Item label="Basketball" value="Basketball" />
          <Picker.Item label="Tennis" value="Tennis" />
        </Picker>
        <Text>Context:</Text>
        <Picker
          selectedValue={profile.context}
          onValueChange={(val) => setProfile({ ...profile, context: val })}
          style={styles.picker}
        >
          <Picker.Item label="Before Game" value="Before Game" />
          <Picker.Item label="After Practice" value="After Practice" />
          <Picker.Item label="Post Tournament" value="Post Tournament" />
        </Picker>
        <Text>Anxiety Level:</Text>
        <Picker
          selectedValue={profile.anxiety_level}
          onValueChange={(val) => setProfile({ ...profile, anxiety_level: val })}
          style={styles.picker}
        >
          <Picker.Item label="Low" value="Low" />
          <Picker.Item label="Medium" value="Medium" />
          <Picker.Item label="High" value="High" />
        </Picker>
        <Text>Motivation Level:</Text>
        <Picker
          selectedValue={profile.motivation_level}
          onValueChange={(val) => setProfile({ ...profile, motivation_level: val })}
          style={styles.picker}
        >
          <Picker.Item label="Low" value="Low" />
          <Picker.Item label="Medium" value="Medium" />
          <Picker.Item label="High" value="High" />
        </Picker>
        <Button title="Start Simulation" onPress={handleStart} />
      </View>
    );
  }

  if (step === 'evaluate') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>AI Evaluation of Your Coaching</Text>
        {loading ? (
          <Text>Evaluating...</Text>
        ) : evaluationResult ? (
          <View style={{ marginTop: 10 }}>
            {evaluationResult?.includes('Score:') ? (
              <>
                <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
                  {evaluationResult.split('\n')[0].replace('Score:', 'Score (out of 10):')}
                </Text>
                <Text style={{ color: 'white', marginTop: 6 }}>
                  {evaluationResult.split('\n')[1].replace('Feedback:', 'Feedback:')}
                </Text>
              </>
            ) : (
              <Text style={{ color: 'white' }}>{evaluationResult}</Text>
            )}
          </View>
        ) : (
          <Text style={{ color: 'white' }}>No feedback yet.</Text>
        )}
        <Button
          title="Start New Simulation"
          onPress={() => {
            setStep('form');
            setChat([]);
            setEvaluationResult(null);
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={chat}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <Text style={item.sender === 'coach' ? styles.coachMsg : styles.athleteMsg}>
            {item.sender === 'coach' ? 'Coach: ' : 'Athlete: '}
            {item.message}
          </Text>
        )}
        style={styles.chat}
      />
      <TextInput
        value={input}
        onChangeText={setInput}
        placeholder="Type your message..."
        style={styles.input}
      />
      <Button title={loading ? 'Thinking...' : 'Send'} onPress={sendMessage} disabled={loading} />
      <Button title="End Conversation" onPress={endConversationAndEvaluate} color="#999" />
      <Button
  title="Back to Dashboard"
  onPress={() => router.push('/coach')}
  color="#999"
/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 40, backgroundColor: '#000' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, color: 'white' },
  chat: { flex: 1, marginBottom: 12 },
  coachMsg: { alignSelf: 'flex-end', backgroundColor: '#14532d', padding: 10, borderRadius: 6, marginBottom: 6, color: 'white' },
  athleteMsg: { alignSelf: 'flex-start', backgroundColor: '#450a0a', padding: 10, borderRadius: 6, marginBottom: 6, color: 'white' },
  input: { borderWidth: 1, padding: 10, borderRadius: 5, marginBottom: 10, color: 'white', borderColor: '#444' },
  picker: { color: 'white', backgroundColor: '#222', marginBottom: 10 },
});
