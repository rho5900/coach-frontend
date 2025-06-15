// app/login.tsx
import { useState } from 'react';
import { View, Text, TextInput, Button, Switch, StyleSheet } from 'react-native';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../constants/firebaseConfig';
import { useRouter } from 'expo-router';
import { v4 as uuidv4 } from 'uuid'; // install with: npm install uuid

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isCoach, setIsCoach] = useState(false);
  const [teamIdInput, setTeamIdInput] = useState('');
  const [teamIdCreated, setTeamIdCreated] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const router = useRouter();
  const [name, setName] = useState('');


  const handleAuth = async () => {
  try {
    if (mode === 'signup') {
    if (!name.trim()) {
    alert('Please enter your full name.');
    return;
  }

  const res = await createUserWithEmailAndPassword(auth, email, password);
      const uid = res.user.uid; 

      if (isCoach) {
        const teamId = uuidv4().slice(0, 6);
        await setDoc(doc(db, 'users', uid), {
        name,
          role: 'coach',
          teamId,
        });
        setTeamIdCreated(teamId); // show team code on screen
        return; // ⛔️ Stop here so UI waits for coach to click "Continue"
      } else {
        if (!teamIdInput.trim()) {
          alert('Please enter a team code.');
          return;
        }

        await setDoc(doc(db, 'users', uid), {
            name,
          role: 'athlete',
          teamId: teamIdInput.trim(),
        });

        router.replace('/athlete'); // ✅ route athlete immediately
      }
    } else {
      // Login path
      const res = await signInWithEmailAndPassword(auth, email, password);
      const uid = res.user.uid;

      // Get user role from Firestore
      const userDoc = await getDoc(doc(db, 'users', uid));
      const role = userDoc.data()?.role;

      if (role === 'coach') {
        router.replace('/coach');
      } else {
        router.replace('/athlete');
      }
    }
  } catch (err: any) {
    alert(err.message);
  }
};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{mode === 'signup' ? 'Sign Up' : 'Log In'}</Text>

      {teamIdCreated ? (
        <>
          <Text style={styles.teamCodeLabel}>Your Team Code:</Text>
    <Text style={styles.teamCode}>{teamIdCreated}</Text>
    <Button title="Continue to Dashboard" onPress={() => router.replace('/coach')} />
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Email"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {mode === 'signup' && (
            <>

            <TextInput
      style={styles.input}
      placeholder="Full Name"
      value={name}
      onChangeText={setName}
    />


              <View style={styles.switchRow}>
                <Text>Coach Role?</Text>
                <Switch value={isCoach} onValueChange={setIsCoach} />
              </View>

              {!isCoach && (
                <TextInput
                  style={styles.input}
                  placeholder="Enter Team Code"
                  value={teamIdInput}
                  onChangeText={setTeamIdInput}
                />
              )}
            </>
          )}

          <Button title={mode === 'signup' ? 'Create Account' : 'Login'} onPress={handleAuth} />
          <Button
            title={`Switch to ${mode === 'signup' ? 'Login' : 'Sign Up'}`}
            onPress={() => {
              setMode(mode === 'signup' ? 'login' : 'signup');
              setTeamIdCreated('');
            }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 12,
    padding: 10,
    borderRadius: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  teamCodeLabel: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 6,
  },
  teamCode: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'green',
  },
});
