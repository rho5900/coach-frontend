// athlete.tsx (updated: label changed to "Submit Privately", header made more conversational, and prompt expanded)

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { db } from '@/constants/firebaseConfig';
import { addDoc, collection, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';

export default function AthleteScreen() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [anonymous, setAnonymous] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    const fetchName = async () => {
      if (!user) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      setName(userDoc.data()?.name || null);
    };
    fetchName();
  }, [user]);

  const handleSubmit = async () => {
    if (!message.trim()) return;

    setLoading(true);
    setSubmitted(false);

    try {
      if (!user) throw new Error("No user");
      console.log("🟢 Starting submission");

      const res = await fetch('https://coach-backend-hnvv.onrender.com/reflect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message }),
});

console.log("🟡 Status:", res.status);

if (!res.ok) {
  const errorText = await res.text();
  console.log("🔴 Error Response:", errorText);  // <- ADD THIS
  throw new Error('Reflection API failed');
}


      console.log("🟢 Got response from Flask");

      if (!res.ok) throw new Error('Reflection API failed');

      const data = await res.json();
      console.log("🟢 Sentiment:", data);

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const role = userDoc.data()?.role;
      const teamId = userDoc.data()?.teamId;

      console.log("🟢 Role:", role, "Team:", teamId);

      if (role !== 'athlete') {
        Alert.alert("Error", "Only athletes can submit reflections.");
        throw new Error("Invalid role");
      }

      await addDoc(collection(db, 'reflections'), {
        athlete: user.email,
        name: anonymous ? null : userDoc.data()?.name || '',
        message,
        sentiment: data.sentiment,
        score: data.score,
        teamId,
        anonymous,
        userId: user.uid,
        timestamp: new Date(),
      });

      console.log("✅ Reflection saved");

      setSubmitted(true);
      setMessage('');
    } catch (err) {
      console.error('❌ Submission failed:', err);
      Alert.alert('Error', 'Failed to submit reflection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {name && <Text style={styles.greeting}>Hi {name} 👋</Text>}

      <Text style={styles.title}>How are you feeling today?</Text>

      <TextInput
        style={styles.input}
        placeholder="You can reflect on how you felt after practice, during a game, about team dynamics, your motivation, a recent challenge, or even your goals."
        multiline
        value={message}
        onChangeText={setMessage}
      />
      <View style={styles.switchRow}>
        <Text style={{ marginRight: 10 }}>Submit Privately</Text>
        <Button title={anonymous ? "Yes" : "No"} onPress={() => setAnonymous(!anonymous)} />
      </View>

      <Button title="Submit Reflection" onPress={handleSubmit} />

      {loading && <ActivityIndicator style={{ marginTop: 10 }} />}

      {submitted && (
        <Text style={styles.result}>✅ Thanks for your response!</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  greeting: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 100,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 15,
    padding: 10,
    borderRadius: 5,
    textAlignVertical: 'top',
  },
  result: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: 'green',
  },
});